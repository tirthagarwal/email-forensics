"""
deployment_ml_features.py
──────────────────────────
PCAP/Zeek-native deployment feature extraction for unsupervised
TLS anomaly detection.

DESIGN RULES:
  - MUST NOT import from security_rules.py, risk_engine.py, or
    any other deterministic-rule module.
  - MUST NOT use security-rule outputs (weak_cipher, weak_tls_version,
    certificate_problem, missing_starttls, plaintext_auth_risk, etc.)
    as ML features.
  - Consumes raw session and crypto-feature dicts produced by
    tls_analyzer.py and crypto_features.py ONLY.
  - Missing values are handled explicitly (documented imputation /
    sentinel categoricals) and never treated as secure or insecure.

FEATURE SCHEMA VERSION: 1.0.0
"""

import math
from typing import Any, Dict, List, Optional

# ─── Schema ─────────────────────────────────────────────────────────────────
FEATURE_SCHEMA_VERSION = "1.0.0"

# Ordered list of feature names fed to the ML model (after encoding).
# Expanding this list requires a model retrain.
NUMERIC_FEATURE_NAMES: List[str] = [
    "client_bytes_log",
    "server_bytes_log",
    "client_packets_log",
    "server_packets_log",
    "duration_log",
    "bytes_ratio",
    "packets_ratio",
    "certificate_key_size_scaled",
    "tls_established_flag",
    "forward_secrecy_flag",
]

CATEGORICAL_FEATURE_NAMES: List[str] = [
    "protocol_cat",
    "tls_version_cat",
    "cipher_suite_cat",
    "elliptic_curve_cat",
]

ALL_FEATURE_NAMES: List[str] = NUMERIC_FEATURE_NAMES + CATEGORICAL_FEATURE_NAMES

# ─── Categorical vocabularies (low-cardinality) ──────────────────────────────
PROTOCOL_VOCAB = ["SMTP", "IMAP", "POP3", "UNKNOWN"]
TLS_VERSION_VOCAB = ["TLSv13", "TLSv12", "TLSv11", "TLSv10", "SSLv3", "UNKNOWN"]
# Common cipher suites observed across email traffic; anything else → UNKNOWN
CIPHER_SUITE_VOCAB = [
    "TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384",
    "TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256",
    "TLS_ECDHE_RSA_WITH_AES_256_CBC_SHA384",
    "TLS_ECDHE_RSA_WITH_AES_128_CBC_SHA256",
    "TLS_AES_256_GCM_SHA384",
    "TLS_AES_128_GCM_SHA256",
    "UNKNOWN",
]
CURVE_VOCAB = ["x25519", "secp256r1", "secp384r1", "secp521r1", "UNKNOWN"]

# Scale factor for certificate key size (divide by 4096 so that 2048→0.5,
# 4096→1.0, None→0.0).
CERT_KEY_SCALE = 4096.0


# ─── Core extractor ─────────────────────────────────────────────────────────

def build_deployment_features(session: Dict[str, Any]) -> Dict[str, Any]:
    """
    Extract raw (pre-transformation) deployment feature values from a
    normalized Zeek session dictionary.

    Parameters
    ----------
    session : dict
        A session dict as produced by tls_analyzer.analyze_zeek_logs().
        Expected sub-keys: 'connection', 'email_protocol', 'tls',
        'certificate' (may be None).

    Returns
    -------
    dict
        Raw feature values suitable for passing to
        transform_deployment_features().
    """
    conn        = session.get("connection") or {}
    email_proto = session.get("email_protocol") or {}
    tls         = session.get("tls") or {}
    cert        = session.get("certificate") or {}

    # ── Traffic / Flow metrics ───────────────────────────────────────────
    client_bytes   = _safe_int(conn.get("client_bytes"),   default=0)
    server_bytes   = _safe_int(conn.get("server_bytes"),   default=0)
    client_packets = _safe_int(conn.get("client_packets"), default=0)
    server_packets = _safe_int(conn.get("server_packets"), default=0)
    duration       = _safe_float(conn.get("duration"),     default=0.0)

    # ── Session / Email protocol ─────────────────────────────────────────
    protocol = (email_proto.get("protocol") or "UNKNOWN").upper()
    tls_established = bool(email_proto.get("tls_established", False))

    # ── TLS structural characteristics ───────────────────────────────────
    tls_version  = tls.get("version")   or None
    cipher_suite = tls.get("cipher")    or None
    curve        = tls.get("curve")     or None

    # Forward secrecy: derived from cipher suite name, NOT from
    # the security-rule evaluated forward_secrecy_indicator flag.
    forward_secrecy = _derive_forward_secrecy(cipher_suite)

    # ── Certificate structural ───────────────────────────────────────────
    cert_key_size = _safe_int(cert.get("key_length"), default=None)

    return {
        # raw numeric
        "client_bytes":    client_bytes,
        "server_bytes":    server_bytes,
        "client_packets":  client_packets,
        "server_packets":  server_packets,
        "duration":        duration,
        "certificate_key_size": cert_key_size,
        # raw boolean
        "tls_established":    tls_established,
        "forward_secrecy":    forward_secrecy,
        # raw categorical
        "protocol":     protocol,
        "tls_version":  tls_version,
        "cipher_suite": cipher_suite,
        "elliptic_curve": curve,
    }


def transform_deployment_features(
    raw: Dict[str, Any],
    means: Optional[Dict[str, float]] = None,
    stds:  Optional[Dict[str, float]] = None,
) -> Dict[str, float]:
    """
    Apply documented transformations to produce a numeric feature
    vector suitable for IsolationForest.

    Transformations applied:
      - log1p(x) for all positive flow counts/bytes/duration.
      - safe ratio = a / (b + 1) to avoid division by zero.
      - certificate_key_size scaled by CERT_KEY_SCALE; missing → 0.0.
      - Binary flags: 0.0 or 1.0.
      - Categorical → one-hot over documented vocabulary lists.

    If means/stds are provided, numeric features are Z-score
    standardized using them.

    Parameters
    ----------
    raw   : output of build_deployment_features()
    means : mapping feature_name → training mean (optional)
    stds  : mapping feature_name → training std  (optional)

    Returns
    -------
    dict  feature_name → float
    """
    feats: Dict[str, float] = {}

    # ── Log-transformed flow features ────────────────────────────────────
    feats["client_bytes_log"]   = math.log1p(max(0, raw.get("client_bytes",   0)))
    feats["server_bytes_log"]   = math.log1p(max(0, raw.get("server_bytes",   0)))
    feats["client_packets_log"] = math.log1p(max(0, raw.get("client_packets", 0)))
    feats["server_packets_log"] = math.log1p(max(0, raw.get("server_packets", 0)))
    feats["duration_log"]       = math.log1p(max(0, raw.get("duration",       0.0)))

    # ── Safe ratios ───────────────────────────────────────────────────────
    cb = max(0, raw.get("client_bytes",   0))
    sb = max(0, raw.get("server_bytes",   0))
    cp = max(0, raw.get("client_packets", 0))
    sp = max(0, raw.get("server_packets", 0))
    feats["bytes_ratio"]   = cb / (sb + 1)
    feats["packets_ratio"] = cp / (sp + 1)

    # ── Certificate key size scaled ───────────────────────────────────────
    ck = raw.get("certificate_key_size")
    feats["certificate_key_size_scaled"] = (
        float(ck) / CERT_KEY_SCALE if ck is not None else 0.0
    )

    # ── Binary flags ──────────────────────────────────────────────────────
    feats["tls_established_flag"] = 1.0 if raw.get("tls_established") else 0.0
    feats["forward_secrecy_flag"] = 1.0 if raw.get("forward_secrecy") else 0.0

    # ── Categorical one-hot ───────────────────────────────────────────────
    feats.update(_onehot("protocol_cat",     raw.get("protocol"),     PROTOCOL_VOCAB))
    feats.update(_onehot("tls_version_cat",  raw.get("tls_version"),  TLS_VERSION_VOCAB))
    feats.update(_onehot("cipher_suite_cat", raw.get("cipher_suite"), CIPHER_SUITE_VOCAB))
    feats.update(_onehot("elliptic_curve_cat", raw.get("elliptic_curve"), CURVE_VOCAB))

    # ── Optional Z-score standardization ─────────────────────────────────
    if means and stds:
        for k in list(feats.keys()):
            if k in means and k in stds and stds[k] > 0:
                feats[k] = (feats[k] - means[k]) / stds[k]

    return feats


def get_feature_names_encoded() -> List[str]:
    """
    Return the full ordered list of encoded feature column names as
    they appear in the matrix passed to IsolationForest.
    One-hot columns expand each categorical feature.
    """
    names = list(NUMERIC_FEATURE_NAMES)  # numeric / binary subset
    # categorical one-hot names
    for vocab_name, vocab in [
        ("protocol_cat",     PROTOCOL_VOCAB),
        ("tls_version_cat",  TLS_VERSION_VOCAB),
        ("cipher_suite_cat", CIPHER_SUITE_VOCAB),
        ("elliptic_curve_cat", CURVE_VOCAB),
    ]:
        for v in vocab:
            names.append(f"{vocab_name}__{v}")
    return names


def feature_dict_to_vector(feat_dict: Dict[str, float]) -> List[float]:
    """
    Convert a transformed feature dict into an ordered numeric list
    aligned with get_feature_names_encoded().
    """
    return [feat_dict.get(name, 0.0) for name in get_feature_names_encoded()]


def validate_deployment_feature_schema(feat_dict: Dict[str, float]) -> bool:
    """
    Verify that a transformed feature dict contains all expected
    column names.  Returns True if valid, raises ValueError if not.
    """
    expected = set(get_feature_names_encoded())
    actual   = set(feat_dict.keys())
    missing  = expected - actual
    if missing:
        raise ValueError(
            f"Deployment feature schema mismatch — missing columns: {sorted(missing)}"
        )
    return True


# ─── Internal helpers ────────────────────────────────────────────────────────

def _onehot(prefix: str, value: Optional[str], vocab: List[str]) -> Dict[str, float]:
    """
    Produce one-hot encoded dict for a categorical value.
    Values not in vocab are mapped to the 'UNKNOWN' bin.
    """
    out: Dict[str, float] = {}
    norm = (value or "UNKNOWN").strip()
    if norm not in vocab:
        norm = "UNKNOWN"
    for v in vocab:
        out[f"{prefix}__{v}"] = 1.0 if norm == v else 0.0
    return out


def _derive_forward_secrecy(cipher_suite: Optional[str]) -> Optional[bool]:
    """
    Derive forward-secrecy indication from the cipher suite name alone
    (NOT from security-rule evaluation).

    Returns None when cipher_suite is unknown.
    """
    if cipher_suite is None:
        return None
    upper = cipher_suite.upper()
    return any(kw in upper for kw in ("ECDHE", "DHE", "EDH"))


def _safe_int(value: Any, default: Any = 0) -> Any:
    if value is None:
        return default
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def _safe_float(value: Any, default: float = 0.0) -> float:
    if value is None:
        return default
    try:
        return float(value)
    except (TypeError, ValueError):
        return default
