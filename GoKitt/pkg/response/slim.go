// Package response provides optimized JSON response builders
// that only serialize fields actually used by the JS client
package response

import (
	"encoding/json"

	"github.com/kittclouds/gokitt/pkg/graph"
)

// SlimGraph is a minimal graph representation for JS consumption
// Only includes fields that Angular actually uses
type SlimGraph struct {
	Nodes map[string]SlimNode `json:"nodes"`
	Edges []SlimEdge          `json:"edges"`
}

// SlimNode contains only the fields JS uses
type SlimNode struct {
	Label   string   `json:"label"`
	Kind    string   `json:"kind"`
	Aliases []string `json:"aliases,omitempty"`
}

// SlimEdge contains only the fields JS uses
type SlimEdge struct {
	Source     string  `json:"source"`
	Target     string  `json:"target"`
	Type       string  `json:"type"`
	Confidence float64 `json:"confidence"`
}

// SlimScanResponse is the minimal scan response for JS
type SlimScanResponse struct {
	Graph    *SlimGraph `json:"graph"`
	TimingUS int64      `json:"timing_us"`
	// CST and scan details are omitted - Angular doesn't use them
}

// FromConceptGraph converts a full ConceptGraph to SlimGraph
func FromConceptGraph(cg *graph.ConceptGraph) *SlimGraph {
	if cg == nil {
		return nil
	}

	sg := &SlimGraph{
		Nodes: make(map[string]SlimNode, len(cg.Nodes)),
		Edges: make([]SlimEdge, 0, len(cg.Edges)),
	}

	// Convert nodes
	for id, node := range cg.Nodes {
		sg.Nodes[id] = SlimNode{
			Label: node.Label,
			Kind:  node.Kind,
		}
	}

	// Convert edges - use Edges slice (populated by ToSerializable)
	for _, edge := range cg.Edges {
		sg.Edges = append(sg.Edges, SlimEdge{
			Source:     edge.Source,
			Target:     edge.Target,
			Type:       edge.Relation,
			Confidence: edge.Weight,
		})
	}

	return sg
}

// MarshalSlimResponse creates a minimal JSON response
func MarshalSlimResponse(graph *graph.ConceptGraph, timingUS int64) ([]byte, error) {
	resp := SlimScanResponse{
		Graph:    FromConceptGraph(graph),
		TimingUS: timingUS,
	}
	return json.Marshal(resp)
}
