// Package extraction provides unified entity and relation extraction from text
// using a single LLM call. It composes with pkg/batch for the actual LLM
// completion and handles prompt construction, response parsing, and JSON repair.
package extraction

// EntityKind matches TypeScript ENTITY_KINDS from cozo/utils/types.ts.
type EntityKind string

const (
	KindCharacter EntityKind = "CHARACTER"
	KindNPC       EntityKind = "NPC"
	KindLocation  EntityKind = "LOCATION"
	KindItem      EntityKind = "ITEM"
	KindFaction   EntityKind = "FACTION"
	KindEvent     EntityKind = "EVENT"
	KindConcept   EntityKind = "CONCEPT"
)

// validKinds is the set of recognized entity kinds for validation.
var validKinds = map[EntityKind]bool{
	KindCharacter: true,
	KindNPC:       true,
	KindLocation:  true,
	KindItem:      true,
	KindFaction:   true,
	KindEvent:     true,
	KindConcept:   true,
}

// IsValidKind checks if a string is a recognized EntityKind.
func IsValidKind(s string) bool {
	return validKinds[EntityKind(s)]
}

// RelationType constants from GoKitt's verb lexicon.
// Kept as strings for flexibility — the LLM may produce non-standard types.
const (
	RelLeads          = "LEADS"
	RelMemberOf       = "MEMBER_OF"
	RelReportsTo      = "REPORTS_TO"
	RelCommands       = "COMMANDS"
	RelAlliedWith     = "ALLIED_WITH"
	RelEnemyOf        = "ENEMY_OF"
	RelFriendOf       = "FRIEND_OF"
	RelRivalOf        = "RIVAL_OF"
	RelBattles        = "BATTLES"
	RelDefeats        = "DEFEATS"
	RelKilledBy       = "KILLED_BY"
	RelCaptures       = "CAPTURES"
	RelCaptiveOf      = "CAPTIVE_OF"
	RelOwns           = "OWNS"
	RelCreated        = "CREATED"
	RelDestroyed      = "DESTROYED"
	RelUses           = "USES"
	RelLocatedIn      = "LOCATED_IN"
	RelTraveledTo     = "TRAVELED_TO"
	RelOriginatesFrom = "ORIGINATES_FROM"
	RelKnows          = "KNOWS"
	RelTeaches        = "TEACHES"
	RelLearnedFrom    = "LEARNED_FROM"
	RelSpeaksTo       = "SPEAKS_TO"
	RelMentions       = "MENTIONS"
	RelReveals        = "REVEALS"
	RelBecomes        = "BECOMES"
	RelTransformsInto = "TRANSFORMS_INTO"
	RelInheritsFrom   = "INHERITS_FROM"
	RelParticipatesIn = "PARTICIPATES_IN"
	RelWitnesses      = "WITNESSES"
	RelCauses         = "CAUSES"
)

// AllRelationTypes lists every recognized relation type for prompt construction.
var AllRelationTypes = []string{
	RelLeads, RelMemberOf, RelReportsTo, RelCommands,
	RelAlliedWith, RelEnemyOf, RelFriendOf, RelRivalOf,
	RelBattles, RelDefeats, RelKilledBy, RelCaptures, RelCaptiveOf,
	RelOwns, RelCreated, RelDestroyed, RelUses,
	RelLocatedIn, RelTraveledTo, RelOriginatesFrom,
	RelKnows, RelTeaches, RelLearnedFrom,
	RelSpeaksTo, RelMentions, RelReveals,
	RelBecomes, RelTransformsInto, RelInheritsFrom,
	RelParticipatesIn, RelWitnesses, RelCauses,
}

// AllEntityKinds lists every recognized entity kind for prompt construction.
var AllEntityKinds = []string{
	string(KindCharacter), string(KindNPC), string(KindLocation),
	string(KindItem), string(KindFaction), string(KindEvent), string(KindConcept),
}

// ---------------------------------------------------------------------------
// Extraction result types
// ---------------------------------------------------------------------------

// ExtractedEntity represents an entity extracted by the LLM.
type ExtractedEntity struct {
	Label      string     `json:"label"`
	Kind       EntityKind `json:"kind"`
	Aliases    []string   `json:"aliases,omitempty"`
	Confidence float64    `json:"confidence"`
}

// ExtractedRelation represents a relationship extracted by the LLM.
// Maps to GoKitt's QuadPlus structure for CST validation.
type ExtractedRelation struct {
	Subject        string  `json:"subject"`
	SubjectKind    string  `json:"subjectKind,omitempty"`
	Object         string  `json:"object"`
	ObjectKind     string  `json:"objectKind,omitempty"`
	Verb           string  `json:"verb"`
	RelationType   string  `json:"relationType"`
	Manner         string  `json:"manner,omitempty"`
	Location       string  `json:"location,omitempty"`
	Time           string  `json:"time,omitempty"`
	Recipient      string  `json:"recipient,omitempty"`
	Confidence     float64 `json:"confidence"`
	SourceSentence string  `json:"sourceSentence"`
}

// ExtractionResult is the unified output from a single LLM call.
type ExtractionResult struct {
	Entities  []ExtractedEntity   `json:"entities"`
	Relations []ExtractedRelation `json:"relations"`
}
