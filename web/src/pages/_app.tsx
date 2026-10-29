import type { AppProps } from 'next/app'
import Head from 'next/head'
import { RescueAIProvider } from '../lib/store'
import '../styles/globals.css'

export default function App({ Component, pageProps }: AppProps) {
  return (
    <RescueAIProvider>
      <Head>
        <title>RescueAI — Stray Dog Identification & Health Records</title>
        <meta
          name="description"
          content="AI-powered stray dog identification, QR collar tags, vaccination tracking, and community health management."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </Head>
      <Component {...pageProps} />
    </RescueAIProvider>
  )
}
