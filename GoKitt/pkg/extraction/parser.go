package extraction

import (
	"encoding/json"
	"fmt"
	"regexp"
	"strings"
)

// ParseResponse parses the raw LLM response into an ExtractionResult.
// Handles markdown code fences and attempts repair on malformed JSON.
func ParseResponse(raw string) (*ExtractionResult, error) {
	cleaned := stripCodeFence(strings.TrimSpace(raw))
	if cleaned == "" {
		return &ExtractionResult{}, nil
	}

	// Try parsing as unified {entities: [...], relations: [...]}
	var result ExtractionResult
	if err := json.Unmarshal([]byte(cleaned), &result); err == nil {
		return filterResult(&result), nil
	}

	// If that fails, try to parse as a raw array (backward compat — entity-only)
	var arr []json.RawMessage
	if err := json.Unmarshal([]byte(cleaned), &arr); err == nil {
		entities := parseEntityArray(cleaned)
		return &ExtractionResult{Entities: entities}, nil
	}

	// Last resort: regex repair
	entities := repairEntities(cleaned)
	relations := repairRelations(cleaned)

	if len(entities) == 0 && len(relations) == 0 {
		return nil, fmt.Errorf("extraction: failed to parse LLM response")
	}

	return &ExtractionResult{
		Entities:  entities,
		Relations: relations,
	}, nil
}

// stripCodeFence removes markdown code block wrappers (```json ... ```).
func stripCodeFence(s string) string {
	if !strings.HasPrefix(s, "```") {
		return s
	}
	lines := strings.Split(s, "\n")
	// Remove first line (```json or ```)
	if len(lines) > 0 {
		lines = lines[1:]
	}
	// Remove last line if it's a closing fence
	if len(lines) > 0 && strings.HasPrefix(strings.TrimSpace(lines[len(lines)-1]), "```") {
		lines = lines[:len(lines)-1]
	}
	return strings.Join(lines, "\n")
}

// filterResult validates and cleans parsed entities and relations.
func filterResult(r *ExtractionResult) *ExtractionResult {
	out := &ExtractionResult{
		Entities:  make([]ExtractedEntity, 0, len(r.Entities)),
		Relations: make([]ExtractedRelation, 0, len(r.Relations)),
	}

	for _, e := range r.Entities {
		e.Label = strings.TrimSpace(e.Label)
		if e.Label == "" {
			continue
		}

		// Normalize kind to uppercase
		kindUpper := EntityKind(strings.ToUpper(string(e.Kind)))
		if !IsValidKind(string(kindUpper)) {
			continue // Skip unknown kinds
		}
		e.Kind = kindUpper

		// Default confidence
		if e.Confidence <= 0 {
			e.Confidence = 0.8
		}

		// Clean aliases
		if len(e.Aliases) > 0 {
			cleaned := make([]string, 0, len(e.Aliases))
			for _, a := range e.Aliases {
				a = strings.TrimSpace(a)
				if a != "" {
					cleaned = append(cleaned, a)
				}
			}
			e.Aliases = cleaned
		}

		out.Entities = append(out.Entities, e)
	}

	for _, r := range r.Relations {
		r.Subject = strings.TrimSpace(r.Subject)
		r.Object = strings.TrimSpace(r.Object)
		r.RelationType = strings.ToUpper(strings.ReplaceAll(strings.TrimSpace(r.RelationType), " ", "_"))

		if r.Subject == "" || r.Object == "" || r.RelationType == "" {
			continue
		}

		// Default verb from relation type if missing
		if r.Verb == "" {
			r.Verb = strings.ToLower(strings.ReplaceAll(r.RelationType, "_", " "))
		} else {
			r.Verb = strings.TrimSpace(r.Verb)
		}

		// Default confidence
		if r.Confidence <= 0 {
			r.Confidence = 0.7
		}

		// Trim optional fields
		r.Manner = strings.TrimSpace(r.Manner)
		r.Location = strings.TrimSpace(r.Location)
		r.Time = strings.TrimSpace(r.Time)
		r.Recipient = strings.TrimSpace(r.Recipient)
		r.SourceSentence = strings.TrimSpace(r.SourceSentence)
		r.SubjectKind = strings.TrimSpace(r.SubjectKind)
		r.ObjectKind = strings.TrimSpace(r.ObjectKind)

		out.Relations = append(out.Relations, r)
	}

	return out
}

// parseEntityArray parses a raw JSON array as entities.
func parseEntityArray(raw string) []ExtractedEntity {
	var items []struct {
		Label      string   `json:"label"`
		Kind       string   `json:"kind"`
		Aliases    []string `json:"aliases"`
		Confidence float64  `json:"confidence"`
	}
	if err := json.Unmarshal([]byte(raw), &items); err != nil {
		return nil
	}

	entities := make([]ExtractedEntity, 0, len(items))
	for _, item := range items {
		label := strings.TrimSpace(item.Label)
		kindUpper := strings.ToUpper(strings.TrimSpace(item.Kind))
		if label == "" || !IsValidKind(kindUpper) {
			continue
		}
		conf := item.Confidence
		if conf <= 0 {
			conf = 0.8
		}
		entities = append(entities, ExtractedEntity{
			Label:      label,
			Kind:       EntityKind(kindUpper),
			Aliases:    item.Aliases,
			Confidence: conf,
		})
	}
	return entities
}

// Regex patterns for repair — match complete JSON objects.
var entityPattern = regexp.MustCompile(
	`\{\s*"label"\s*:\s*"[^"]+"\s*,\s*"kind"\s*:\s*"[^"]+"\s*(?:,\s*"[^"]+"\s*:\s*(?:"[^"]*"|[\d.]+|\[[^\]]*\]|true|false|null))*\s*\}`,
)

var relationPattern = regexp.MustCompile(
	`\{\s*"subject"\s*:\s*"[^"]+"\s*,\s*"object"\s*:\s*"[^"]+"\s*,\s*"relationType"\s*:\s*"[^"]+"\s*(?:,\s*"[^"]+"\s*:\s*(?:"[^"]*"|[\d.]+|\[[^\]]*\]|true|false|null))*\s*\}`,
)

// repairEntities attempts to recover entity objects from malformed JSON.
func repairEntities(raw string) []ExtractedEntity {
	matches := entityPattern.FindAllString(raw, -1)
	entities := make([]ExtractedEntity, 0, len(matches))

	for _, m := range matches {
		var item struct {
			Label      string   `json:"label"`
			Kind       string   `json:"kind"`
			Aliases    []string `json:"aliases"`
			Confidence float64  `json:"confidence"`
		}
		if err := json.Unmarshal([]byte(m), &item); err != nil {
			continue
		}
		label := strings.TrimSpace(item.Label)
		kindUpper := strings.ToUpper(strings.TrimSpace(item.Kind))
		if label == "" || !IsValidKind(kindUpper) {
			continue
		}
		conf := item.Confidence
		if conf <= 0 {
			conf = 0.8
		}
		entities = append(entities, ExtractedEntity{
			Label:      label,
			Kind:       EntityKind(kindUpper),
			Aliases:    item.Aliases,
			Confidence: conf,
		})
	}

	return entities
}

// repairRelations attempts to recover relation objects from malformed JSON.
func repairRelations(raw string) []ExtractedRelation {
	matches := relationPattern.FindAllString(raw, -1)
	relations := make([]ExtractedRelation, 0, len(matches))

	for _, m := range matches {
		var item ExtractedRelation
		if err := json.Unmarshal([]byte(m), &item); err != nil {
			continue
		}
		item.Subject = strings.TrimSpace(item.Subject)
		item.Object = strings.TrimSpace(item.Object)
		item.RelationType = strings.ToUpper(strings.ReplaceAll(strings.TrimSpace(item.RelationType), " ", "_"))

		if item.Subject == "" || item.Object == "" || item.RelationType == "" {
			continue
		}
		if item.Verb == "" {
			item.Verb = strings.ToLower(strings.ReplaceAll(item.RelationType, "_", " "))
		}
		if item.Confidence <= 0 {
			item.Confidence = 0.7
		}
		relations = append(relations, item)
	}

	return relations
}
