import asyncio
import ssl
import smtplib
import time
import sys

HOST = "127.0.0.1"
PORT = 2525
CERTFILE = "part1/test_tls/server.crt"
KEYFILE = "part1/test_tls/server.key"

async def handle_client(reader, writer):
    try:
        # 1. Server Banner
        writer.write(b"220 mail.example.local ESMTP ready\r\n")
        await writer.drain()

        # 2. EHLO
        line1 = await reader.readline()
        print(f"[Server] Received pre-TLS: {line1.decode().strip()}")
        writer.write(b"250-mail.example.local Hello\r\n250-STARTTLS\r\n250 OK\r\n")
        await writer.drain()

        # 3. STARTTLS command
        line2 = await reader.readline()
        print(f"[Server] Received: {line2.decode().strip()}")
        if b"STARTTLS" not in line2.upper():
            writer.close()
            return

        # 4. Ready to start TLS
        writer.write(b"220 2.0.0 Ready to start TLS\r\n")
        await writer.drain()

        # 5. Perform TLS upgrade on server socket
        ssl_ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
        ssl_ctx.load_cert_chain(certfile=CERTFILE, keyfile=KEYFILE)

        loop = asyncio.get_running_loop()
        transport = writer.transport
        protocol = transport.get_protocol()

        new_transport = await loop.start_tls(
            transport,
            protocol,
            ssl_ctx,
            server_side=True
        )

        # 6. Post-TLS interaction (encrypted)
        # Note: StreamReader is tied to transport
        new_reader = asyncio.StreamReader()
        new_protocol = asyncio.StreamReaderProtocol(new_reader)
        new_transport.set_protocol(new_protocol)
        new_writer = asyncio.StreamWriter(new_transport, new_protocol, new_reader, loop)

        # Encrypted EHLO
        enc_line1 = await new_reader.readline()
        print(f"[Server] Received (Encrypted): {enc_line1.decode(errors='replace').strip()}")
        new_writer.write(b"250-mail.example.local\r\n250 HELP\r\n")
        await new_writer.drain()

        # Encrypted MAIL FROM
        enc_line2 = await new_reader.readline()
        print(f"[Server] Received (Encrypted): {enc_line2.decode(errors='replace').strip()}")
        new_writer.write(b"250 2.1.0 Sender OK\r\n")
        await new_writer.drain()

        # Encrypted RCPT TO
        enc_line3 = await new_reader.readline()
        print(f"[Server] Received (Encrypted): {enc_line3.decode(errors='replace').strip()}")
        new_writer.write(b"250 2.1.5 Recipient OK\r\n")
        await new_writer.drain()

        # Encrypted DATA or QUIT
        enc_line4 = await new_reader.readline()
        print(f"[Server] Received (Encrypted): {enc_line4.decode(errors='replace').strip()}")
        new_writer.write(b"221 2.0.0 Bye\r\n")
        await new_writer.drain()

        new_writer.close()
        await new_writer.wait_closed()
    except Exception as e:
        print(f"[Server Error] {e}", file=sys.stderr)

def run_client():
    time.sleep(0.5)
    print("[Client] Connecting to SMTP server...")
    with smtplib.SMTP(HOST, PORT) as client:
        client.set_debuglevel(1)
        client.ehlo("client.example.local")

        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE

        print("[Client] Issuing STARTTLS...")
        client.starttls(context=ctx)
        print("[Client] TLS established successfully!")

        client.ehlo("client.example.local")
        client.mail("sender@example.local")
        client.rcpt("recipient@example.local")
        client.quit()
        print("[Client] Session finished.")

async def main():
    server = await asyncio.start_server(handle_client, HOST, PORT)
    print(f"[Server] SMTP Server listening on {HOST}:{PORT}...")
    
    # Run client in thread
    loop = asyncio.get_running_loop()
    client_future = loop.run_in_executor(None, run_client)

    await client_future
    server.close()
    await server.wait_closed()
    print("[Server] Server closed.")

if __name__ == "__main__":
    asyncio.run(main())
