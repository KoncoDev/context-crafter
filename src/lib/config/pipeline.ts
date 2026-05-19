import type { ProjectStatus, VariantStatus } from '$lib/types/pipeline';

interface StatusConfig {
	label: string;
	description: string;
	color: string;
	isAIProcessing: boolean;
}

export const PROJECT_STATUS_CONFIG: Record<ProjectStatus, StatusConfig> = {
	draft: {
		label: 'Draft',
		description: 'Ready for initial submission',
		color: 'text-ink-3 border-rule-2',
		isAIProcessing: false
	},
	extracting_master: {
		label: 'Extracting',
		description: 'AI is building the master source file',
		color: 'text-parchment border-parchment/30',
		isAIProcessing: true
	},
	pending_master_validation: {
		label: 'Review Master',
		description: 'Master source ready for your review',
		color: 'text-ochre border-ochre/30',
		isAIProcessing: false
	},
	generating_personas: {
		label: 'Generating Personas',
		description: 'AI is creating persona profiles',
		color: 'text-parchment border-parchment/30',
		isAIProcessing: true
	},
	pending_persona_validation: {
		label: 'Review Personas',
		description: 'Persona profiles ready for your review',
		color: 'text-ochre border-ochre/30',
		isAIProcessing: false
	},
	processing_variants: {
		label: 'Processing',
		description: 'Individual variants are moving through the pipeline',
		color: 'text-bone border-rule-2',
		isAIProcessing: false
	},
	completed: {
		label: 'Completed',
		description: 'All variants have been approved',
		color: 'text-moss border-moss/30',
		isAIProcessing: false
	},
	error: {
		label: 'Error',
		description: 'An error occurred — requires intervention',
		color: 'text-rust border-rust/30',
		isAIProcessing: false
	}
};

interface VariantStatusConfig extends StatusConfig {
	step: number;
}

export const VARIANT_STATUS_CONFIG: Record<VariantStatus, VariantStatusConfig> = {
	draft: {
		label: 'Draft',
		description: 'Ready to start research',
		step: 3,
		color: 'text-ink-3 border-rule-2',
		isAIProcessing: false
	},
	researching: {
		label: 'Researching',
		description: 'AI is enriching with local market data',
		step: 3,
		color: 'text-parchment border-parchment/30',
		isAIProcessing: true
	},
	pending_research_validation: {
		label: 'Review Research',
		description: 'Dynamic context ready for your review',
		step: 3,
		color: 'text-ochre border-ochre/30',
		isAIProcessing: false
	},
	architecting: {
		label: 'Architecting',
		description: 'AI is building the messaging & UX framework',
		step: 4,
		color: 'text-parchment border-parchment/30',
		isAIProcessing: true
	},
	designing: {
		label: 'Designing',
		description: 'AI is crafting the brand & design system',
		step: 5,
		color: 'text-parchment border-parchment/30',
		isAIProcessing: true
	},
	pending_final_validation: {
		label: 'Final Review',
		description: 'Branding & design system ready for final approval',
		step: 5,
		color: 'text-ochre border-ochre/30',
		isAIProcessing: false
	},
	completed: {
		label: 'Completed',
		description: 'Variant is fully approved and locked',
		step: 5,
		color: 'text-moss border-moss/30',
		isAIProcessing: false
	}
};

export const AGENT_NAMES: Record<number, string> = {
	1: 'Fact Extractor',
	2: 'Consumer Psychology Expert',
	3: 'Local Marketing Researcher',
	4: 'Lead Conversion Architect',
	5: 'UX/UI Design Architect'
};

export const VARIANT_STEP_LABELS: Record<number, string> = {
	3: 'Local Marketing Researcher',
	4: 'Lead Conversion Architect',
	5: 'UX/UI Design Architect'
};
