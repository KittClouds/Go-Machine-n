# Architecture Defense: The Go Supremacy (Single Runtime)

## 1. The Decision: Go Over Rust
**Verdict**: We deploy `gokitt` (Go) as the sole Wasm runtime. `kittcore` (Rust) is deprecated to reference status.

### The "Twin" Reality
While Rust and Go are "twins" in capability for this domain, they are not equals in fast-iteration utility for narrative graph theory.
*   **Dev Velocity**: The Go implementation reached feature parity in **2 days**. The Rust equivolent took **2 weeks**.
*   **Dependency Hell**: Rust required heavy crates like `Rowan` (CST), `PetGraph`, and `wasm-bindgen` glue. Go required **zero** heavy dependencies—just pure standard library and lightweight structs.
*   **Binary Size**: Go (TinyGo) produces competitive Wasm binaries without the compilation overhead of release-mode Rust.

## 2. Data Topology (The Brain)

### The Wormhole Advantage
*   **Cross-Document Linking**: Go handles `Wormhole` pointers and `Golden Spike` convergence points naturally as struct pointers.
*   **Memory Model**: Rust's borrow checker fights against the cyclic, interconnected nature of narrative graphs. Go's GC handles the "spaghetti" of story nodes (Act -> Chapter -> Character -> Act) effortlessly.

### CozoDB (Datalog) vs Dexie (IndexedDB)
We retain the bifurcation of **Storage**, but the **Compute** is unified.
*   **Dexie**: The Document Store (Source of Truth).
*   **CozoDB**: The Graph Index (Reasoning).
*   **Go Runtime**: The bridge that synchronizes them.

## 3. The CST (Concrete Syntax Tree)
*   **Implementation**: Pure Go.
*   **Why**: Building a CST in Rust often requires `unsafe` or complex library abstractions (Rowan) to handle the parent-child pointers. In Go, it is ergonomic, readable, and standard code.
*   **Performance**: The Aho-Corasick implementation in Go matches the speed of the Rust version for our dataset sizes, rendering the "Rewrite in Rust for Speed" argument null.

## 4. Operational Strategy
*   **Single Binary**: No complex build chains mixing Cargo and Go. Just `tinygo build`.
*   **Focus**: We spend our complexity budget on **Graph Theory** (Datalog rules, Narrative topology), not on fighting the language compiler.

