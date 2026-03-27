#!/bin/bash
set -euo pipefail

# Attestara ZK Circuit Build Script
# Compiles all 4 Circom circuits and runs Groth16 trusted setup (dev ceremony)
#
# Prerequisites: circom 2.x, snarkjs 0.7.x
# Run from: packages/contracts/

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CONTRACTS_DIR="$(dirname "$SCRIPT_DIR")"
BUILD_DIR="$SCRIPT_DIR/build"
PTAU_DIR="$BUILD_DIR/ptau"
VKEY_DIR="$BUILD_DIR/verification_keys"

# Circuit names and their source filenames
CIRCUITS=("MandateBound" "ParameterRange" "CredentialFreshness" "IdentityBinding")
DIR_NAMES=("mandate_bound" "parameter_range" "credential_freshness" "identity_binding")

# Powers of tau size (2^14 = 16384 constraints, sufficient for all circuits)
PTAU_POWER=14
PTAU_FILE="$PTAU_DIR/powersOfTau28_hez_final_${PTAU_POWER}.ptau"
PTAU_URL="https://storage.googleapis.com/zkevm/ptau/powersOfTau28_hez_final_${PTAU_POWER}.ptau"

echo "============================================"
echo "  Attestara ZK Circuit Build"
echo "============================================"
echo ""

# Create build directories
mkdir -p "$BUILD_DIR" "$PTAU_DIR" "$VKEY_DIR"

# Step 1: Download powers-of-tau file if not present
if [ ! -f "$PTAU_FILE" ]; then
    echo "[1/4] Downloading powers-of-tau file (ptau ${PTAU_POWER})..."
    curl -L -o "$PTAU_FILE" "$PTAU_URL"
    echo "  Downloaded: $PTAU_FILE"
else
    echo "[1/4] Powers-of-tau file already exists, skipping download."
fi
echo ""

# Step 2: Compile each circuit
echo "[2/4] Compiling circuits..."
cd "$CONTRACTS_DIR"

for i in "${!CIRCUITS[@]}"; do
    CIRCUIT="${CIRCUITS[$i]}"
    DIR_NAME="${DIR_NAMES[$i]}"
    CIRCUIT_BUILD="$BUILD_DIR/$DIR_NAME"

    echo "  Compiling $CIRCUIT..."
    mkdir -p "$CIRCUIT_BUILD"

    circom "circuits/${CIRCUIT}.circom" \
        --r1cs \
        --wasm \
        --sym \
        -l node_modules \
        -o "$CIRCUIT_BUILD" \
        2>&1

    # Verify outputs exist
    if [ ! -f "$CIRCUIT_BUILD/${CIRCUIT}_js/${CIRCUIT}.wasm" ]; then
        echo "  ERROR: WASM output not found for $CIRCUIT"
        exit 1
    fi

    # Get constraint count
    CONSTRAINTS=$(npx snarkjs r1cs info "$CIRCUIT_BUILD/${CIRCUIT}.r1cs" 2>&1 | grep "Constraints:" | awk '{print $NF}')
    echo "  $CIRCUIT: ${CONSTRAINTS:-?} constraints"
done
echo ""

# Step 3: Groth16 setup for each circuit
echo "[3/4] Running Groth16 trusted setup..."

for i in "${!CIRCUITS[@]}"; do
    CIRCUIT="${CIRCUITS[$i]}"
    DIR_NAME="${DIR_NAMES[$i]}"
    CIRCUIT_BUILD="$BUILD_DIR/$DIR_NAME"

    echo "  Setup for $CIRCUIT..."

    # Phase 2: Generate initial zkey
    npx snarkjs groth16 setup \
        "$CIRCUIT_BUILD/${CIRCUIT}.r1cs" \
        "$PTAU_FILE" \
        "$CIRCUIT_BUILD/${CIRCUIT}_0000.zkey" \
        2>&1

    # Contribute entropy (dev ceremony — NOT secure for production)
    npx snarkjs zkey contribute \
        "$CIRCUIT_BUILD/${CIRCUIT}_0000.zkey" \
        "$CIRCUIT_BUILD/${DIR_NAME}_final.zkey" \
        --name="Attestara Dev Ceremony" \
        -e="attestara-dev-entropy-$(date +%s)-${RANDOM}" \
        2>&1

    # Export verification key
    npx snarkjs zkey export verificationkey \
        "$CIRCUIT_BUILD/${DIR_NAME}_final.zkey" \
        "$VKEY_DIR/${DIR_NAME}_vkey.json" \
        2>&1

    # Clean up intermediate zkey
    rm -f "$CIRCUIT_BUILD/${CIRCUIT}_0000.zkey"

    echo "  $CIRCUIT setup complete."
done
echo ""

# Step 4: Reorganize artifacts to match prover expected structure
echo "[4/4] Reorganizing artifacts for prover service..."

for i in "${!CIRCUITS[@]}"; do
    CIRCUIT="${CIRCUITS[$i]}"
    DIR_NAME="${DIR_NAMES[$i]}"
    CIRCUIT_BUILD="$BUILD_DIR/$DIR_NAME"

    # Prover expects: {dir_name}_js/{dir_name}.wasm
    # Circom outputs: {Circuit}_js/{Circuit}.wasm
    # Need to create symlinks or copy with correct names
    WASM_SRC="$CIRCUIT_BUILD/${CIRCUIT}_js/${CIRCUIT}.wasm"
    WASM_DIR="$CIRCUIT_BUILD/${DIR_NAME}_js"
    WASM_DST="$WASM_DIR/${DIR_NAME}.wasm"

    if [ ! -d "$WASM_DIR" ]; then
        mkdir -p "$WASM_DIR"
    fi

    if [ "$WASM_SRC" != "$WASM_DST" ] && [ ! -f "$WASM_DST" ]; then
        cp "$WASM_SRC" "$WASM_DST"
        echo "  Copied WASM: ${DIR_NAME}_js/${DIR_NAME}.wasm"
    fi
done
echo ""

# Summary
echo "============================================"
echo "  Build Complete!"
echo "============================================"
echo ""
echo "Artifacts in: $BUILD_DIR"
echo ""
for i in "${!CIRCUITS[@]}"; do
    CIRCUIT="${CIRCUITS[$i]}"
    DIR_NAME="${DIR_NAMES[$i]}"
    echo "  $CIRCUIT:"
    echo "    WASM:  build/${DIR_NAME}/${DIR_NAME}_js/${DIR_NAME}.wasm"
    echo "    zkey:  build/${DIR_NAME}/${DIR_NAME}_final.zkey"
    echo "    vkey:  build/verification_keys/${DIR_NAME}_vkey.json"
    echo ""
done
echo "NOTE: This uses a dev ceremony. For production, use a proper"
echo "multi-party computation (MPC) trusted setup ceremony."
