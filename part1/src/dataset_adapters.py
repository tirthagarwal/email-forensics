"""
dataset_adapters.py
────────────────────
Data Ingestion & Schema Adapter Architecture for External Public Datasets.

SUPPORTED DATASET SCHEMAS:
  1. Passive OS Fingerprinting (passive_os_tls_clean.csv)
  2. CESNET-TLS22 (NetFlow/IPFIX + TLS Handshake Features)
  3. CipherSpectrum (TLS Cipher/Version Telemetry)

DESIGN PRINCIPLE:
  External datasets are NOT schema-compatible out of the box with our PCAP/Zeek
  deployment schema (v1.0.0).  This module translates external feature names,
  applies required log/ratio transformations, fills missing fields with
  documented sentinel defaults, and maps categories into our target one-hot
  vocabularies without schema corruption.
"""

import math
from typing import Any, Dict, List, Optional
from deployment_ml_features import (
    FEATURE_SCHEMA_VERSION,
    get_feature_names_encoded,
    transform_deployment_features,
)


class CESNETTLS22Adapter:
    """
    Adapter for CESNET-TLS22 dataset records.
    Maps NetFlow/IPFIX + TLS handshake fields into deployment ML schema v1.0.0.
    """

    @staticmethod
    def adapt_row(row: Dict[str, Any]) -> Dict[str, float]:
        raw_deployment = {
            "client_bytes":   _safe_int(row.get("BYTES_IN") or row.get("bytes_orig"), 0),
            "server_bytes":   _safe_int(row.get("BYTES_OUT") or row.get("bytes_resp"), 0),
            "client_packets": _safe_int(row.get("PKTS_IN") or row.get("pkts_orig"), 0),
            "server_packets": _safe_int(row.get("PKTS_OUT") or row.get("pkts_resp"), 0),
            "duration":       _safe_float(row.get("DURATION") or row.get("duration"), 0.0),
            "certificate_key_size": _safe_int(row.get("TLS_KEY_LENGTH"), None),
            "tls_established": bool(row.get("TLS_ESTABLISHED", True)),
            "forward_secrecy": bool(row.get("TLS_PFS", False)),
            "protocol":       str(row.get("APPLICATION_PROTOCOL") or "UNKNOWN").upper(),
            "tls_version":    str(row.get("TLS_VERSION") or "UNKNOWN"),
            "cipher_suite":   str(row.get("TLS_CIPHER") or "UNKNOWN"),
            "elliptic_curve": str(row.get("TLS_CURVE") or "UNKNOWN"),
        }
        return transform_deployment_features(raw_deployment)


class PassiveOSDatasetAdapter:
    """
    Adapter for Passive OS Fingerprinting dataset records.
    Maps passive OS feature columns into deployment ML schema v1.0.0.
    """

    @staticmethod
    def adapt_row(row: Dict[str, Any]) -> Dict[str, float]:
        bytes_a = _safe_int(row.get("BYTES A") or row.get("bytes_a"), 0)
        pkts_a  = _safe_int(row.get("PACKETS A") or row.get("packets_a"), 0)
        setup_t = _safe_float(row.get("TLS_SETUP_TIME") or row.get("tls_setup_time"), 0.0)

        # TLS setup time in dataset is in microseconds/ms; divide by 1e3 for seconds float
        dur_sec = setup_t / 1000.0 if setup_t > 1000.0 else setup_t

        tls_ver = str(row.get("tls_server_version_name") or row.get("TLS_SERVER_VERSION") or "UNKNOWN")
        if tls_ver in ("771", "771.0"):
            tls_ver = "TLSv12"
        elif tls_ver in ("772", "772.0"):
            tls_ver = "TLSv13"
        elif tls_ver in ("770", "770.0"):
            tls_ver = "TLSv11"
        elif tls_ver in ("769", "769.0"):
            tls_ver = "TLSv10"

        cipher = str(row.get("cipher_suite_name") or row.get("TLS_CIPHER_SUITE") or "UNKNOWN")
        curves = str(row.get("TLS_ELLIPTIC_CURVES") or "")
        curve  = "x25519" if ("1D" in curves or "29" in curves) else "UNKNOWN"

        fwd_sec_val = row.get("forward_secrecy_indicator")
        fwd_sec = bool(fwd_sec_val) if fwd_sec_val is not None else False

        raw_deployment = {
            "client_bytes":   bytes_a,
            "server_bytes":   0,
            "client_packets": pkts_a,
            "server_packets": 0,
            "duration":       dur_sec,
            "certificate_key_size": None,
            "tls_established": True,
            "forward_secrecy": fwd_sec,
            "protocol":       "UNKNOWN",
            "tls_version":    tls_ver,
            "cipher_suite":   cipher,
            "elliptic_curve": curve,
        }
        return transform_deployment_features(raw_deployment)


class GenericPCAPZeekAdapter:
    """
    Adapter for generic Zeek connection + TLS logs.
    """

    @staticmethod
    def adapt_session(session: Dict[str, Any]) -> Dict[str, float]:
        conn = session.get("connection", {})
        email_proto = session.get("email_protocol", {})
        tls = session.get("tls", {})
        cert = session.get("certificate", {})

        raw_deployment = {
            "client_bytes":   _safe_int(conn.get("client_bytes"), 0),
            "server_bytes":   _safe_int(conn.get("server_bytes"), 0),
            "client_packets": _safe_int(conn.get("client_packets"), 0),
            "server_packets": _safe_int(conn.get("server_packets"), 0),
            "duration":       _safe_float(conn.get("duration"), 0.0),
            "certificate_key_size": cert.get("key_length") if cert else None,
            "tls_established": bool(email_proto.get("tls_established", False)),
            "forward_secrecy": bool(tls.get("forward_secrecy", False)),
            "protocol":       str(email_proto.get("protocol") or "UNKNOWN").upper(),
            "tls_version":    tls.get("version"),
            "cipher_suite":   tls.get("cipher"),
            "elliptic_curve": tls.get("curve"),
        }
        return transform_deployment_features(raw_deployment)


def _safe_int(v: Any, default: Any = 0) -> Any:
    if v is None:
        return default
    try:
        return int(v)
    except (TypeError, ValueError):
        return default


def _safe_float(v: Any, default: float = 0.0) -> float:
    if v is None:
        return default
    try:
        return float(v)
    except (TypeError, ValueError):
        return default
