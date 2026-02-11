package extraction

import (
	"testing"
)

// ---------------------------------------------------------------------------
// ParseResponse tests
// ---------------------------------------------------------------------------

func TestParseResponse_ValidJSON(t *testing.T) {
	raw := `{
		"entities": [
			{"label": "Luffy", "kind": "CHARACTER", "confidence": 0.95},
			{"label": "Marineford", "kind": "LOCATION", "confidence": 0.9, "aliases": ["Marine HQ"]}
		],
		"relations": [
			{
				"subject": "Luffy",
				"object": "Marineford",
				"verb": "traveled to",
				"relationType": "TRAVELED_TO",
				"confidence": 0.85,
				"sourceSentence": "Luffy traveled to Marineford."
			}
		]
	}`

	result, err := ParseResponse(raw)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if len(result.Entities) != 2 {
		t.Errorf("expected 2 entities, got %d", len(result.Entities))
	}
	if len(result.Relations) != 1 {
		t.Errorf("expected 1 relation, got %d", len(result.Relations))
	}

	// Check entity details
	if result.Entities[0].Label != "Luffy" {
		t.Errorf("expected label 'Luffy', got %q", result.Entities[0].Label)
	}
	if result.Entities[0].Kind != KindCharacter {
		t.Errorf("expected kind CHARACTER, got %q", result.Entities[0].Kind)
	}

	// Check Marineford aliases
	if len(result.Entities[1].Aliases) != 1 || result.Entities[1].Aliases[0] != "Marine HQ" {
		t.Errorf("expected alias 'Marine HQ', got %v", result.Entities[1].Aliases)
	}

	// Check relation details
	rel := result.Relations[0]
	if rel.Subject != "Luffy" || rel.Object != "Marineford" {
		t.Errorf("unexpected relation subject/object: %q -> %q", rel.Subject, rel.Object)
	}
	if rel.RelationType != "TRAVELED_TO" {
		t.Errorf("expected relationType TRAVELED_TO, got %q", rel.RelationType)
	}
}

func TestParseResponse_WithCodeFence(t *testing.T) {
	raw := "```json\n" + `{
		"entities": [
			{"label": "Zoro", "kind": "CHARACTER", "confidence": 0.9}
		],
		"relations": []
	}` + "\n```"

	result, err := ParseResponse(raw)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(result.Entities) != 1 {
		t.Errorf("expected 1 entity, got %d", len(result.Entities))
	}
	if result.Entities[0].Label != "Zoro" {
		t.Errorf("expected 'Zoro', got %q", result.Entities[0].Label)
	}
}

func TestParseResponse_TruncatedJSON(t *testing.T) {
	// Simulate truncated response — valid entity objects but malformed outer structure
	raw := `{"entities": [{"label": "Nami", "kind": "CHARACTER", "confidence": 0.9}], "relations": [{"subject": "Nami", "object": "Grand Line", "relationType": "TRAVELED_TO", "confidence": 0.8, "sourceSentence": "Nami sailed the Grand Line.`

	result, err := ParseResponse(raw)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// Should recover at least the entity via regex repair
	if len(result.Entities) == 0 {
		t.Error("expected at least 1 repaired entity")
	}
}

func TestParseResponse_EmptyInput(t *testing.T) {
	result, err := ParseResponse("")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(result.Entities) != 0 || len(result.Relations) != 0 {
		t.Errorf("expected empty result for empty input")
	}
}

func TestParseResponse_InvalidKindFiltered(t *testing.T) {
	raw := `{
		"entities": [
			{"label": "Chopper", "kind": "CHARACTER", "confidence": 0.9},
			{"label": "Devil Fruit", "kind": "POWERUP", "confidence": 0.7}
		],
		"relations": []
	}`

	result, err := ParseResponse(raw)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// "POWERUP" is not a valid kind — should be filtered out
	if len(result.Entities) != 1 {
		t.Errorf("expected 1 entity (invalid kind filtered), got %d", len(result.Entities))
	}
	if result.Entities[0].Label != "Chopper" {
		t.Errorf("expected Chopper, got %q", result.Entities[0].Label)
	}
}

func TestParseResponse_CaseInsensitiveKind(t *testing.T) {
	raw := `{
		"entities": [
			{"label": "Sanji", "kind": "character", "confidence": 0.85}
		],
		"relations": []
	}`

	result, err := ParseResponse(raw)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if len(result.Entities) != 1 {
		t.Fatalf("expected 1 entity, got %d", len(result.Entities))
	}
	if result.Entities[0].Kind != KindCharacter {
		t.Errorf("expected kind normalized to CHARACTER, got %q", result.Entities[0].Kind)
	}
}

func TestParseResponse_RelationDefaults(t *testing.T) {
	raw := `{
		"entities": [],
		"relations": [
			{
				"subject": "Luffy",
				"object": "Ace",
				"relationType": "FRIEND_OF",
				"sourceSentence": "Luffy and Ace are friends."
			}
		]
	}`

	result, err := ParseResponse(raw)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if len(result.Relations) != 1 {
		t.Fatalf("expected 1 relation, got %d", len(result.Relations))
	}

	rel := result.Relations[0]
	// Verb should default from relationType
	if rel.Verb != "friend of" {
		t.Errorf("expected default verb 'friend of', got %q", rel.Verb)
	}
	// Confidence should default to 0.7
	if rel.Confidence != 0.7 {
		t.Errorf("expected default confidence 0.7, got %f", rel.Confidence)
	}
}

func TestParseResponse_LegacyEntityArray(t *testing.T) {
	// Some models may return a plain array of entities (backward compat)
	raw := `[
		{"label": "Robin", "kind": "CHARACTER", "confidence": 0.9},
		{"label": "Ohara", "kind": "LOCATION", "confidence": 0.85}
	]`

	result, err := ParseResponse(raw)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if len(result.Entities) != 2 {
		t.Errorf("expected 2 entities from legacy array, got %d", len(result.Entities))
	}
	if len(result.Relations) != 0 {
		t.Errorf("expected 0 relations from legacy array, got %d", len(result.Relations))
	}
}

func TestParseResponse_SkipsEmptyLabels(t *testing.T) {
	raw := `{
		"entities": [
			{"label": "", "kind": "CHARACTER", "confidence": 0.9},
			{"label": "Brook", "kind": "CHARACTER", "confidence": 0.8}
		],
		"relations": [
			{"subject": "", "object": "Brook", "relationType": "FRIEND_OF", "confidence": 0.7}
		]
	}`

	result, err := ParseResponse(raw)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if len(result.Entities) != 1 {
		t.Errorf("expected 1 entity (empty label filtered), got %d", len(result.Entities))
	}
	if len(result.Relations) != 0 {
		t.Errorf("expected 0 relations (empty subject filtered), got %d", len(result.Relations))
	}
}

// ---------------------------------------------------------------------------
// BuildUserPrompt tests
// ---------------------------------------------------------------------------

func TestBuildUserPrompt_WithKnownEntities(t *testing.T) {
	prompt := BuildUserPrompt("Some text about pirates.", []string{"Luffy", "Zoro"})

	if !contains(prompt, "KNOWN ENTITIES") {
		t.Error("expected KNOWN ENTITIES section in prompt")
	}
	if !contains(prompt, "Luffy, Zoro") {
		t.Error("expected known entities list in prompt")
	}
	if !contains(prompt, "Some text about pirates.") {
		t.Error("expected text in prompt")
	}
}

func TestBuildUserPrompt_NoKnownEntities(t *testing.T) {
	prompt := BuildUserPrompt("Some text.", nil)

	if contains(prompt, "KNOWN ENTITIES") {
		t.Error("should NOT include KNOWN ENTITIES when none provided")
	}
	if !contains(prompt, "Some text.") {
		t.Error("expected text in prompt")
	}
}

func TestBuildUserPrompt_TruncatesLongText(t *testing.T) {
	longText := make([]byte, MaxTextLength+500)
	for i := range longText {
		longText[i] = 'x'
	}

	prompt := BuildUserPrompt(string(longText), nil)

	// The prompt should contain at most MaxTextLength chars of the input text
	// (plus the prompt template itself)
	if contains(prompt, string(longText)) {
		t.Error("expected text to be truncated")
	}
}

// ---------------------------------------------------------------------------
// IsValidKind tests
// ---------------------------------------------------------------------------

func TestIsValidKind(t *testing.T) {
	validCases := []string{"CHARACTER", "NPC", "LOCATION", "ITEM", "FACTION", "EVENT", "CONCEPT"}
	for _, k := range validCases {
		if !IsValidKind(k) {
			t.Errorf("expected %q to be valid", k)
		}
	}

	invalidCases := []string{"POWERUP", "character", "Monster", "", "WEAPON"}
	for _, k := range invalidCases {
		if IsValidKind(k) {
			t.Errorf("expected %q to be invalid", k)
		}
	}
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

func contains(s, substr string) bool {
	return len(s) >= len(substr) && containsCheck(s, substr)
}

func containsCheck(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}
