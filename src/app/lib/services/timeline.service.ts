// src/app/lib/services/timeline.service.ts
// Service for managing Timeline Codex events

import { Injectable } from '@angular/core';
import { liveQuery, Observable as DexieObservable } from 'dexie';
import { from, Observable } from 'rxjs';
import { db, TimelineEvent } from '../dexie/db';
import { v4 as uuidv4 } from 'uuid';

@Injectable({
    providedIn: 'root'
})
export class TimelineService {

    /**
     * Get all events for a narrative, sorted by order
     */
    getEventsForNarrative$(narrativeId: string): Observable<TimelineEvent[]> {
        return from(
            liveQuery(() =>
                db.timelineEvents
                    .where('narrativeId')
                    .equals(narrativeId)
                    .sortBy('order')
            ) as DexieObservable<TimelineEvent[]>
        );
    }

    /**
     * Get all events across all narratives (global view)
     */
    getAllEvents$(): Observable<TimelineEvent[]> {
        return from(
            liveQuery(() =>
                db.timelineEvents.orderBy('order').toArray()
            ) as DexieObservable<TimelineEvent[]>
        );
    }

    /**
     * Get a single event by ID
     */
    async getEvent(id: string): Promise<TimelineEvent | undefined> {
        return db.timelineEvents.get(id);
    }

    /**
     * Create a new timeline event
     */
    async createEvent(
        narrativeId: string,
        title: string,
        description: string = '',
        entityIds: string[] = []
    ): Promise<string> {
        const now = Date.now();

        // Get the highest order in this narrative
        const existing = await db.timelineEvents
            .where('narrativeId')
            .equals(narrativeId)
            .toArray();
        const maxOrder = existing.reduce((max, e) => Math.max(max, e.order), 0);

        const event: TimelineEvent = {
            id: uuidv4(),
            narrativeId,
            title,
            description,
            order: maxOrder + 1,
            entityIds,
            status: 'draft',
            createdAt: now,
            updatedAt: now
        };

        await db.timelineEvents.add(event);
        console.log('[TimelineService] Created event:', event.title);
        return event.id;
    }

    /**
     * Update an existing event
     */
    async updateEvent(id: string, updates: Partial<TimelineEvent>): Promise<void> {
        await db.timelineEvents.update(id, {
            ...updates,
            updatedAt: Date.now()
        });
    }

    /**
     * Delete an event
     */
    async deleteEvent(id: string): Promise<void> {
        await db.timelineEvents.delete(id);
    }

    /**
     * Reorder events by providing new order array
     */
    async reorderEvents(eventIds: string[]): Promise<void> {
        await db.transaction('rw', db.timelineEvents, async () => {
            for (let i = 0; i < eventIds.length; i++) {
                await db.timelineEvents.update(eventIds[i], {
                    order: i + 1,
                    updatedAt: Date.now()
                });
            }
        });
    }

    /**
     * Add an entity to an event
     */
    async linkEntity(eventId: string, entityId: string): Promise<void> {
        const event = await db.timelineEvents.get(eventId);
        if (!event) return;

        if (!event.entityIds.includes(entityId)) {
            await db.timelineEvents.update(eventId, {
                entityIds: [...event.entityIds, entityId],
                updatedAt: Date.now()
            });
        }
    }

    /**
     * Remove an entity from an event
     */
    async unlinkEntity(eventId: string, entityId: string): Promise<void> {
        const event = await db.timelineEvents.get(eventId);
        if (!event) return;

        await db.timelineEvents.update(eventId, {
            entityIds: event.entityIds.filter(id => id !== entityId),
            updatedAt: Date.now()
        });
    }

    /**
     * Lock/unlock an event
     */
    async setEventStatus(eventId: string, status: 'draft' | 'locked'): Promise<void> {
        await db.timelineEvents.update(eventId, {
            status,
            updatedAt: Date.now()
        });
    }
}
