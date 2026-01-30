# Optimization of Aho-Corasick Usage

## Goal
Optimize the usage of the `github.com/coregx/ahocorasick` package in `GoKitt` based on documentation analysis.

## Findings from Documentation
The `coregx/ahocorasick` package offers several optimizations and features:
1.  **Prefilter Optimization**: `SetPrefilter(true)` enables heuristic speedups (likely using SIMD/vectorized search for start bytes) to skip non-matching text sections. This is likely **disabled** by default.
2.  **ASCII Optimization**: `SetASCII(true)` assumes only ASCII input. **Not applicable** for us due to Unicode support requirements (names with accents, etc.).
3.  **Byte Classes**: Enabled by default (`SetByteClasses(true)`). Good for memory usage.
4.  **Zero-Allocation Checks**: `IsMatch(haystack)` is optimized for zero-alloc existence checks.
5.  **Thread Safety**: The `Automaton` is immutable and safe for concurrent use.

## Proposed Changes
### `GoKitt/pkg/dafsa/dictionary.go`
*   Modify `Compile` method to chain `.SetPrefilter(true)` in the builder configuration.

## Verification Plan
1.  **Unit Tests**: Run `go test ./GoKitt/pkg/dafsa/...` to ensure no regression in matching logic.
2.  **Manual Verification**: Confirm the application builds and runs.
