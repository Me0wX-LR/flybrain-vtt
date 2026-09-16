#!/usr/bin/env node
/**
 * Author-only CSR packer stub.
 * When connectivity parquet/csv is present, filter synapse count >= 5,
 * dense-index root IDs, write data/graph.csr.bin.gz with header:
 *   magic "FB01" | n_nodes u32 | n_edges u32 | dt_note u32=100
 *   offsets u32[n+1] | targets u32[n_edges] | weights i8[n_edges]
 * little-endian, then gzip.
 */
console.log("pack-graph: no connectivity dump found. Dummy worker does not need CSR.");
console.log("Place a future dump beside this script and extend the packer; do not run from Foundry.");
