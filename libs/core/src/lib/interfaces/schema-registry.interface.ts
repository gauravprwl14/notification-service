/**
 * Interface for event schema
 */
export interface EventSchema {
  /**
   * Event type
   * @example "transaction.completed"
   */
  type: string;

  /**
   * Schema version
   * @example "1.0"
   */
  version: string;

  /**
   * JSON Schema definition for the event payload
   * This is used to validate the event payload
   */
  schema: Record<string, unknown>;

  /**
   * Sample payload for documentation
   */
  samplePayload?: Record<string, unknown>;

  /**
   * Description of the event
   */
  description?: string;

  /**
   * Timestamp when the schema was created (ISO format)
   * @example "2023-01-01T12:00:00Z"
   */
  createdAt: string;

  /**
   * Timestamp when the schema was last updated (ISO format)
   * @example "2023-01-01T12:00:00Z"
   */
  updatedAt: string;
}

/**
 * Interface for schema registry service
 */
export interface SchemaRegistryService {
  /**
   * Get a schema by event type and version
   * @param eventType The event type
   * @param version The schema version
   * @returns A promise that resolves to the event schema or null if not found
   */
  getSchema(eventType: string, version: string): Promise<EventSchema | null>;

  /**
   * Register a new schema
   * @param schema The event schema to register
   * @returns A promise that resolves to the registered schema
   */
  registerSchema(schema: EventSchema): Promise<EventSchema>;

  /**
   * Validate an event payload against its schema
   * @param eventType The event type
   * @param version The schema version
   * @param payload The event payload to validate
   * @returns A promise that resolves to a validation result
   */
  validatePayload(
    eventType: string,
    version: string,
    payload: Record<string, unknown>,
  ): Promise<SchemaValidationResult>;

  /**
   * List all schemas for a specific event type
   * @param eventType The event type
   * @returns A promise that resolves to an array of event schemas
   */
  listSchemaVersions(eventType: string): Promise<EventSchema[]>;
}

/**
 * Interface for schema validation result
 */
export interface SchemaValidationResult {
  /**
   * Whether the validation was successful
   */
  valid: boolean;

  /**
   * Validation errors if any
   */
  errors?: string[];
}
