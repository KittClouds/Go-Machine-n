// Package pool provides object pooling to reduce GC pressure
package pool

import (
	"sync"
)

// MapPool pools map[string]interface{} for JSON output
var MapPool = sync.Pool{
	New: func() interface{} {
		return make(map[string]interface{}, 8)
	},
}

// SlicePool pools []interface{} for JSON output
var SlicePool = sync.Pool{
	New: func() interface{} {
		return make([]interface{}, 0, 32)
	},
}

// StringSlicePool pools []string
var StringSlicePool = sync.Pool{
	New: func() interface{} {
		return make([]string, 0, 16)
	},
}

// GetMap gets a map from pool
func GetMap() map[string]interface{} {
	m := MapPool.Get().(map[string]interface{})
	for k := range m {
		delete(m, k)
	}
	return m
}

// PutMap returns a map to pool
func PutMap(m map[string]interface{}) {
	MapPool.Put(m)
}

// GetSlice gets a slice from pool
func GetSlice() []interface{} {
	s := SlicePool.Get().([]interface{})
	return s[:0]
}

// PutSlice returns a slice to pool
func PutSlice(s []interface{}) {
	SlicePool.Put(s)
}
