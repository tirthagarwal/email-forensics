# Processed Passive OS TLS Clean Dataset (`passive_os_tls_clean.csv`)

## Dataset Overview
- **Source Dataset**: `part1/datasets/passive_os/flows_ground_truth_merged_anonymized.csv`
- **Output File**: `part1/datasets/processed/passive_os_tls_clean.csv`
- **Original Dataset Row Count**: `109,663` rows (Preserved completely unchanged)
- **Processed Dataset Row Count**: `10,894` rows

---

## Filtering Rules Applied
To extract a clean dataset of established TLS sessions suitable for cryptographic posture assessment, the following documented filtering conditions were applied:
```sql
WHERE TLS_SERVER_VERSION > 0 AND TLS_CIPHER_SUITE > 0
```
- **Excluded**: `10,288` non-TLS flows (`TLS_SERVER_VERSION` is `NaN`, cleartext HTTP port 80).
- **Excluded**: `88,481` unanswered / client-only TLS attempts (`TLS_SERVER_VERSION = 0.0` and `TLS_CIPHER_SUITE = 0.0`, no `ServerHello` or cipher suite selection completed).
- **Retained**: `10,894` complete, negotiated TLS handshakes.

---

## Included Fields & Mappings

### 1. Normalized Human-Readable & Numeric Mappings
- `tls_server_version_name`: `"TLS 1.2"` (771) or `"TLS 1.0"` (769)
- `tls_client_version_name`: `"TLS 1.2"` (771), `"TLS 1.1"` (770), or `"TLS 1.0"` (769)
- `cipher_suite_name`:
  - `49171` → `TLS_ECDHE_RSA_WITH_AES_128_CBC_SHA`
  - `49191` → `TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256`
  - `49200` → `TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384`
  - `49192` → `TLS_ECDHE_RSA_WITH_AES_256_CBC_SHA384`
  - `49199` → `TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256`
- `tls_version_numeric`: Integer protocol version code (`771`, `769`)
- `cipher_suite_numeric`: Integer cipher suite code (`49171`, `49191`, `49200`, `49192`, `49199`)

### 2. Derived Cryptographic Features
- `deprecated_tls_version`: `True` for TLS 1.0 (769), `False` for TLS 1.2 (771).
- `forward_secrecy_indicator`: `True` for ECDHE cipher suites.
- `weak_cipher`: `True` for ciphers containing legacy CBC-mode MAC (`CBC_SHA`, e.g. 49171), `False` for GCM/AEAD ciphers.

### 3. Retained Network & TLS Protocol Features
- Network identifiers: `flow_ID`, `UA OS family`, `start`, `end`, `L3 PROTO`, `L4 PROTO`, `BYTES A`, `PACKETS A`, `SRC IP`, `DST IP`, `SRC port`, `DST port`, `TCP flags A`, `TCP SYN Size`, `TCP Win Size`, `TCP SYN TTL`, `IP ToS`.
- TLS handshake metadata: `TLS_CONTENT_TYPE`, `TLS_HANDSHAKE_TYPE`, `TLS_SETUP_TIME`, `TLS_ELLIPTIC_CURVES`, `TLS_EC_POINT_FORMATS`, `TLS_SNI`, `TLS_SNI_LENGTH`, `TLS_ALPN`, `TLS_JA3_FINGERPRINT`.

---

## Excluded Certificate Placeholder Fields
The following fields were excluded from the processed dataset because they contain 100% missing or dummy placeholder values (`0.0`, `-1.0`, or `NaN`) in this flow export:
- `TLS_SIGNATURE_ALG`
- `TLS_PUBLIC_KEY_ALG`
- `TLS_PUBLIC_KEY_LENGTH`
- `TLS_ISSUER_CN`
- `TLS_SUBJECT_CN`
- `TLS_VALIDITY_NOT_BEFORE`
- `TLS_VALIDITY_NOT_AFTER`

---

## Known Limitations
1. **No Certificate Analysis**: Passive X.509 certificate fields are missing from this flow export. Certificate posture evaluation must be conducted using PCAPs with full handshake captures or authorized TLS keylog material.
2. **Version Distribution**: The dataset consists predominantly of TLS 1.2 (`10,884` rows) with a minor presence of TLS 1.0 (`10` rows).
3. **Sparse Features**: `TLS_ALPN` is missing in `95.02%` of clean flows (present only when ALPN extension was negotiated).

---

## Important Usage Notice
> **IMPORTANT**: This processed dataset (`passive_os_tls_clean.csv`) represents a clean, sanitized full session dataset. **It is NOT yet a training, validation, or test split.** Machine learning dataset splitting, feature scaling, or model training must be performed as a separate subsequent step.
