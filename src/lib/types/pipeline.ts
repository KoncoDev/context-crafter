export type ProjectStatus =
	| 'draft'
	| 'extracting_master'
	| 'pending_master_validation'
	| 'generating_personas'
	| 'pending_persona_validation'
	| 'processing_variants'
	| 'completed'
	| 'error';

export type VariantStatus =
	| 'draft'
	| 'researching'
	| 'pending_research_validation'
	| 'architecting'
	| 'designing'
	| 'pending_final_validation'
	| 'completed';

export type TargetLanguage = 'french' | 'english' | 'arabic';

export type PipelineIntent = 'PPC' | 'SEO';

export interface Project {
	id: string;
	name: string;
	raw_data: string;
	target_language: TargetLanguage;
	master_source: string;
	status: ProjectStatus;
	created: string;
	updated: string;
}

export interface Persona {
	id: string;
	name: string;
	target_area: string;
	demographic_summary: string;
	psychological_driver: string;
	buying_trigger: string;
	primary_objection: string;
	preferred_tone: string;
	created: string;
	updated: string;
}

export interface Variant {
	id: string;
	project: string;
	persona: string;
	expand?: { persona?: Persona };
	timeframe: string;
	researching_data: Record<string, unknown> | null;
	architecting_data: Record<string, unknown> | null;
	designing_data: Record<string, unknown> | null;
	status: VariantStatus;
	created: string;
	updated: string;
}
