"""
Intent Classifier Module

This module provides intent classification functionality using keyword-based matching.
It classifies text into main intents and sub-intents using a two-layer keyword matching system.
"""

import logging
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass
import json
from pathlib import Path
from datetime import datetime
import re

# Configure logging
logger = logging.getLogger(__name__)

@dataclass
class IntentResult:
    """Data class to hold intent classification results."""
    main_intent: str
    sub_intents: List[str]
    confidence: float
    needs_review: bool

class IntentClassifier:
    """Classifies text into main intents and sub-intents using keyword matching."""
    
    # Define main intent keywords
    MAIN_INTENT_KEYWORDS = {
        "code_assistance": [
            "code", "programming", "develop", "bug", "fix", "implement", "test", "debug",
            "function", "class", "method", "api", "library", "framework", "dependency",
            "algorithm", "script", "software", "application", "backend", "frontend",
            "database", "query", "sql", "nosql", "server", "client", "deploy",
            "version", "control", "git", "repository", "commit", "branch", "merge",
            "refactor", "optimize", "performance", "security", "authentication",
            "authorization", "encryption", "decryption", "hash", "cryptography",
            "microservice", "container", "docker", "kubernetes", "cloud", "aws",
            "azure", "gcp", "devops", "ci", "cd", "pipeline", "automation"
        ],
        "data_analysis": [
            "data", "analyze", "statistics", "visualize", "chart", "graph", "report",
            "metrics", "trend", "pattern", "dataset", "analysis", "insight",
            "excel", "spreadsheet", "table", "pivot", "filter", "sort", "aggregate",
            "summarize", "calculate", "formula", "function", "query", "sql",
            "database", "warehouse", "lake", "etl", "transform", "clean", "preprocess",
            "machine learning", "ml", "ai", "prediction", "forecast", "regression",
            "classification", "clustering", "nlp", "text mining", "sentiment",
            "correlation", "regression", "hypothesis", "test", "significance"
        ],
        "document_management": [
            "document", "file", "folder", "organize", "store", "archive", "template",
            "version", "share", "access", "permission", "metadata", "format",
            "convert", "pdf", "word", "excel", "powerpoint", "presentation",
            "spreadsheet", "text", "rtf", "html", "markdown", "latex", "compress",
            "extract", "backup", "restore", "sync", "cloud", "storage", "drive",
            "dropbox", "onedrive", "google drive", "sharepoint", "collaborate",
            "review", "comment", "track", "changes", "history", "revision"
        ],
        "communication": [
            "message", "chat", "email", "notify", "announce", "broadcast", "team",
            "collaborate", "feedback", "meeting", "discuss", "communicate",
            "slack", "teams", "discord", "zoom", "webex", "skype", "call",
            "video", "conference", "presentation", "share", "screen", "record",
            "transcript", "summary", "minutes", "agenda", "schedule", "calendar",
            "invite", "participant", "host", "moderate", "facilitate", "lead",
            "follow-up", "reminder", "notification", "alert", "status", "update"
        ],
        "task_management": [
            "task", "todo", "project", "deadline", "priority", "schedule", "assign",
            "track", "progress", "milestone", "workflow", "pipeline", "kanban",
            "sprint", "agile", "scrum", "backlog", "epic", "story", "bug",
            "issue", "ticket", "jira", "trello", "asana", "monday", "notion",
            "board", "list", "card", "checklist", "subtask", "dependency",
            "blocker", "estimate", "time", "effort", "resource", "team",
            "member", "role", "responsibility", "accountability"
        ],
        "learning_education": [
            "learn", "teach", "tutorial", "guide", "documentation", "example",
            "practice", "training", "course", "lesson", "study", "education",
            "school", "university", "college", "class", "lecture", "seminar",
            "workshop", "webinar", "online", "e-learning", "mooc", "certification",
            "exam", "test", "quiz", "assessment", "evaluation", "grade", "score",
            "feedback", "review", "improve", "progress", "achievement", "skill",
            "knowledge", "understanding", "comprehension", "application", "analysis"
        ],
        "technical_support": [
            "support", "help", "issue", "problem", "error", "troubleshoot", "fix",
            "resolve", "maintenance", "upgrade", "install", "configure",
            "hardware", "software", "network", "server", "database", "security",
            "performance", "optimization", "backup", "recovery", "disaster",
            "incident", "outage", "downtime", "monitor", "alert", "log",
            "diagnostic", "debug", "trace", "profile", "benchmark", "test",
            "quality", "assurance", "compliance", "audit", "documentation"
        ],
        "information_query": [
            "what", "how", "when", "where", "why", "who", "query", "search",
            "find", "lookup", "information", "details", "specification",
            "documentation", "manual", "guide", "tutorial", "example", "sample",
            "reference", "api", "endpoint", "parameter", "option", "setting",
            "configuration", "requirement", "prerequisite", "dependency",
            "compatibility", "version", "release", "update", "change", "log"
        ],
        "content_creation": [
            "write", "create", "generate", "compose", "draft", "content", "text",
            "article", "blog", "post", "story", "essay", "copy",
            "document", "script", "screenplay", "novel", "book",
            "poem", "poetry", "prose", "fiction", "non-fiction",
            "biography", "autobiography", "memoir", "journal",
            "diary", "letter", "email", "report", "summary",
            "review", "critique", "analysis", "commentary",
            "editorial", "news", "journalism", "press", "media",
            "publication", "publishing", "ghostwriting", "copywriting",
            "technical writing", "creative writing", "academic writing",
            "research paper", "thesis", "dissertation", "white paper",
            "case study", "whitepaper", "ebook", "guide", "tutorial",
            "how-to", "manual", "documentation", "translation",
            "localization", "proofreading", "editing", "formatting",
            "layout", "social media", "tweet", "post", "update",
            "status", "caption", "headline", "title", "subtitle",
            "tagline", "slogan", "catchphrase", "description",
            "bio", "profile", "about", "summary", "abstract",
            "outline", "draft", "version", "revision", "edit",
            "rewrite", "polish", "refine", "enhance", "improve",
            "optimize", "seo", "keyword", "tag", "category",
            "topic", "theme", "style", "tone", "voice", "audience",
            "purpose", "goal", "objective", "format", "structure",
            "organization", "layout", "design", "template",
            "style guide", "branding", "identity", "message",
            "communication", "expression", "narrative", "storytelling",
            "content strategy", "content plan", "content calendar",
            "schedule", "deadline", "timeline", "milestone",
            "deliverable", "output"
        ],
        "system_operation": [
            "system", "operate", "run", "execute", "monitor", "control", "manage",
            "deploy", "maintain", "configure", "optimize", "performance",
            "server", "client", "network", "database", "storage", "backup",
            "recovery", "security", "authentication", "authorization", "encryption",
            "firewall", "proxy", "load balancer", "cache", "queue", "message",
            "event", "log", "metric", "alert", "notification", "report", "dashboard"
        ],
        "research_analysis": [
            "research", "investigate", "study", "analyze", "examine", "evaluate",
            "compare", "review", "assess", "survey", "market", "competitor",
            "trend", "pattern", "insight", "finding", "discovery", "hypothesis",
            "theory", "methodology", "approach", "framework", "model", "concept",
            "principle", "assumption", "limitation", "scope", "objective", "goal",
            "question", "problem", "solution", "recommendation", "conclusion"
        ],
        "automation_workflow": [
            "automate", "workflow", "process", "pipeline", "trigger", "schedule",
            "routine", "batch", "script", "macro", "bot", "robot", "integration",
            "api", "webhook", "event", "action", "condition", "rule", "policy",
            "decision", "branch", "loop", "iteration", "sequence", "parallel",
            "synchronize", "coordinate", "orchestrate", "monitor", "log", "alert",
            "notification", "report", "dashboard", "metric", "performance"
        ],
        "security_compliance": [
            "security", "secure", "protect", "compliance", "policy", "audit",
            "permission", "access", "encrypt", "authenticate", "authorize",
            "firewall", "proxy", "vpn", "ssl", "tls", "certificate", "key",
            "password", "credential", "token", "session", "cookie", "privacy",
            "gdpr", "hipaa", "pci", "sox", "iso", "standard", "regulation",
            "requirement", "control", "measure", "assessment", "evaluation"
        ],
        "resource_management": [
            "resource", "manage", "allocate", "budget", "cost", "inventory",
            "asset", "capacity", "utilization", "optimize", "plan", "forecast",
            "predict", "estimate", "track", "monitor", "report", "dashboard",
            "metric", "kpi", "performance", "efficiency", "productivity",
            "workload", "schedule", "calendar", "availability", "allocation",
            "distribution", "assignment", "delegation", "responsibility"
        ],
        "problem_solving": [
            "solve", "problem", "issue", "fix", "resolve", "troubleshoot",
            "debug", "investigate", "analyze", "solution", "workaround",
            "diagnose", "identify", "locate", "isolate", "reproduce", "verify",
            "validate", "test", "check", "monitor", "log", "trace", "profile",
            "optimize", "improve", "enhance", "refactor", "restructure",
            "redesign", "rearchitect", "migrate", "upgrade", "update"
        ]
    }

    # Define sub-intent keywords
    SUB_INTENT_KEYWORDS = {
        "code_assistance": {
            "code_review": [
                "review", "check", "inspect", "examine", "verify", "validate", "audit", "assess", "evaluate",
                "quality", "standard", "best practice", "guideline", "convention", "pattern", "principle",
                "architecture", "design", "structure", "organization", "composition", "arrangement",
                "readability", "maintainability", "scalability", "reusability", "modularity",
                "performance", "efficiency", "optimization", "resource", "utilization",
                "security", "vulnerability", "threat", "risk", "protection",
                "testing", "coverage", "unit", "integration", "system",
                "documentation", "comment", "explanation", "description", "instruction",
                "style", "format", "indentation", "naming", "convention",
                "complexity", "simplicity", "clarity", "coherence", "consistency",
                "refactoring", "restructuring", "reorganization", "improvement", "enhancement",
                "bug", "error", "issue", "problem", "defect",
                "dependency", "library", "framework", "package", "module",
                "version", "compatibility", "upgrade", "update", "migration",
                "integration", "interface", "api", "service", "endpoint",
                "deployment", "configuration", "environment", "setup", "installation",
                "monitoring", "logging", "tracking", "debugging", "troubleshooting",
                "feedback", "suggestion", "recommendation", "improvement", "enhancement"
            ],
            "bug_fixing": [
                "bug", "error", "fix", "debug", "issue", "problem", "resolve", "troubleshoot",
                "crash", "exception", "failure", "defect", "flaw", "vulnerability", "weakness",
                "investigate", "analyze", "examine", "inspect", "review", "check", "verify",
                "identify", "locate", "isolate", "reproduce", "replicate", "simulate",
                "diagnose", "determine", "ascertain", "establish", "confirm", "validate",
                "solution", "resolution", "remedy", "cure", "treatment", "fix", "repair",
                "patch", "update", "upgrade", "modify", "change", "alter", "adjust",
                "prevent", "avoid", "avert", "forestall", "preclude", "eliminate",
                "test", "verify", "validate", "confirm", "certify", "ensure",
                "document", "record", "log", "track", "monitor", "trace",
                "performance", "efficiency", "optimization", "improvement", "enhancement",
                "security", "protection", "safeguard", "defense", "shield",
                "reliability", "stability", "robustness", "resilience", "durability",
                "compatibility", "interoperability", "conformity", "compliance", "adherence",
                "maintenance", "support", "service", "care", "tending",
                "learning", "improvement", "enhancement", "development", "progress"
            ],
            "code_optimization": [
                "optimize", "improve", "enhance", "performance", "speed", "efficiency",
                "resource", "memory", "cpu", "gpu", "throughput", "latency", "bottleneck",
                "streamline", "simplify", "accelerate", "quicken", "expedite", "facilitate",
                "reduce", "minimize", "decrease", "lower", "diminish", "lessen",
                "eliminate", "remove", "eradicate", "obviate", "preclude", "prevent",
                "cache", "buffer", "pool", "reserve", "store", "save",
                "parallel", "concurrent", "asynchronous", "multithreaded", "distributed",
                "algorithm", "complexity", "efficiency", "scalability", "performance",
                "profiling", "benchmarking", "measurement", "analysis", "evaluation",
                "bottleneck", "constraint", "limitation", "restriction", "boundary",
                "resource", "utilization", "allocation", "management", "optimization",
                "memory", "management", "allocation", "deallocation", "garbage collection",
                "compilation", "interpretation", "execution", "runtime", "performance",
                "database", "query", "index", "optimization", "performance",
                "network", "communication", "protocol", "bandwidth", "latency",
                "security", "encryption", "authentication", "authorization", "protection",
                "reliability", "stability", "robustness", "resilience", "durability",
                "maintainability", "readability", "clarity", "simplicity", "elegance",
                "testing", "verification", "validation", "certification", "quality"
            ],
            "feature_implementation": [
                "feature", "implement", "add", "create", "develop", "build", "functionality",
                "capability", "module", "component", "service", "api", "endpoint",
                "design", "architecture", "structure", "organization", "composition",
                "interface", "api", "contract", "protocol", "specification",
                "integration", "connection", "linkage", "coupling", "binding",
                "testing", "verification", "validation", "certification", "quality",
                "documentation", "comment", "explanation", "description", "instruction",
                "deployment", "release", "publish", "distribute", "deliver",
                "configuration", "setup", "installation", "initialization", "bootstrap",
                "security", "protection", "safeguard", "defense", "shield",
                "performance", "efficiency", "optimization", "improvement", "enhancement",
                "reliability", "stability", "robustness", "resilience", "durability",
                "maintainability", "readability", "clarity", "simplicity", "elegance",
                "scalability", "extensibility", "flexibility", "adaptability", "modularity",
                "compatibility", "interoperability", "conformity", "compliance", "adherence",
                "versioning", "compatibility", "upgrade", "update", "migration",
                "monitoring", "logging", "tracking", "debugging", "troubleshooting",
                "feedback", "suggestion", "recommendation", "improvement", "enhancement"
            ],
            "testing_setup": [
                "test", "unit", "integration", "automated", "qa", "quality", "coverage",
                "case", "scenario", "assertion", "mock", "stub", "fixture", "framework",
                "setup", "configuration", "initialization", "bootstrap", "preparation",
                "execution", "running", "performing", "conducting", "carrying",
                "verification", "validation", "confirmation", "certification", "authentication",
                "assertion", "expectation", "prediction", "assumption", "hypothesis",
                "coverage", "scope", "extent", "range", "breadth",
                "depth", "thoroughness", "completeness", "comprehensiveness", "exhaustiveness",
                "automation", "mechanization", "systematization", "standardization", "regularization",
                "framework", "library", "tool", "utility", "helper",
                "mock", "stub", "fake", "dummy", "spy",
                "fixture", "setup", "teardown", "preparation", "cleanup",
                "assertion", "verification", "validation", "confirmation", "certification",
                "reporting", "logging", "recording", "documentation", "tracking",
                "analysis", "evaluation", "assessment", "review", "examination",
                "debugging", "troubleshooting", "diagnosis", "investigation", "resolution",
                "performance", "load", "stress", "endurance", "reliability",
                "security", "vulnerability", "penetration", "fuzzing", "scanning",
                "maintenance", "support", "service", "care", "tending"
            ]
        },
        "data_analysis": {
            "data_cleaning": [
                "clean", "preprocess", "filter", "remove", "format", "standardize", "normalize",
                "validate", "verify", "quality", "integrity", "consistency", "duplicate",
                "transform", "convert", "change", "modify", "alter", "adjust",
                "structure", "organize", "arrange", "order", "sequence",
                "validate", "verify", "confirm", "certify", "authenticate",
                "quality", "integrity", "consistency", "completeness", "accuracy",
                "duplicate", "redundant", "repetitive", "recurring", "repeating",
                "missing", "null", "empty", "blank", "void",
                "outlier", "anomaly", "exception", "deviation", "variation",
                "noise", "interference", "distortion", "corruption", "contamination",
                "format", "structure", "schema", "template", "pattern",
                "standardize", "normalize", "regularize", "systematize", "formalize",
                "validate", "verify", "confirm", "certify", "authenticate",
                "document", "record", "log", "track", "monitor",
                "analyze", "evaluate", "assess", "review", "examine",
                "improve", "enhance", "better", "perfect", "refine",
                "optimize", "streamline", "simplify", "efficiency", "performance",
                "maintain", "preserve", "conserve", "sustain", "keep",
                "security", "protection", "privacy", "confidentiality", "secrecy"
            ],
            "data_visualization": [
                "visualize", "chart", "graph", "plot", "display", "show", "dashboard",
                "report", "presentation", "infographic", "diagram", "map", "heatmap",
                "bar", "line", "pie", "scatter", "bubble", "area",
                "histogram", "box", "violin", "radar", "polar", "3d",
                "interactive", "dynamic", "animated", "responsive", "adaptive",
                "color", "palette", "scheme", "gradient", "shade",
                "layout", "design", "style", "format", "template",
                "axis", "scale", "grid", "legend", "label",
                "title", "caption", "annotation", "marker", "pointer",
                "tooltip", "hover", "click", "zoom", "pan",
                "filter", "sort", "group", "aggregate", "summarize",
                "export", "save", "download", "share", "publish",
                "embed", "integrate", "incorporate", "include", "combine",
                "responsive", "adaptive", "dynamic", "interactive", "real-time",
                "animation", "transition", "effect", "motion", "movement",
                "accessibility", "usability", "readability", "clarity", "simplicity",
                "performance", "efficiency", "optimization", "improvement", "enhancement",
                "maintenance", "support", "service", "care", "tending"
            ],
            "statistical_analysis": [
                "statistics", "analyze", "correlation", "regression", "distribution",
                "mean", "median", "mode", "variance", "standard deviation", "hypothesis", "test",
                "descriptive", "inferential", "predictive", "prescriptive", "diagnostic",
                "probability", "likelihood", "chance", "odds", "ratio",
                "confidence", "interval", "margin", "error", "significance",
                "sample", "population", "census", "survey", "poll",
                "random", "systematic", "stratified", "cluster", "convenience",
                "bias", "variance", "error", "noise", "interference",
                "outlier", "anomaly", "exception", "deviation", "variation",
                "trend", "pattern", "cycle", "season", "forecast",
                "prediction", "estimation", "projection", "forecasting", "planning",
                "validation", "verification", "confirmation", "certification", "authentication",
                "documentation", "recording", "logging", "tracking", "monitoring",
                "visualization", "chart", "graph", "plot", "display",
                "report", "presentation", "communication", "sharing", "distribution",
                "interpretation", "explanation", "understanding", "comprehension", "insight",
                "decision", "action", "implementation", "execution", "application",
                "improvement", "enhancement", "optimization", "refinement", "perfection"
            ],
            "predictive_modeling": [
                "predict", "forecast", "model", "machine learning", "ml", "ai", "algorithm",
                "training", "testing", "validation", "accuracy", "precision", "recall",
                "supervised", "unsupervised", "reinforcement", "deep", "neural",
                "network", "layer", "node", "weight", "bias",
                "feature", "input", "output", "target", "label",
                "classification", "regression", "clustering", "association", "sequence",
                "decision tree", "random forest", "gradient boosting", "svm", "knn",
                "naive bayes", "logistic regression", "linear regression", "polynomial", "ridge",
                "lasso", "elastic net", "pca", "svd", "lda",
                "hyperparameter", "tuning", "optimization", "grid search", "random search",
                "cross validation", "k-fold", "stratified", "bootstrap", "resampling",
                "overfitting", "underfitting", "bias", "variance", "tradeoff",
                "regularization", "dropout", "batch normalization", "early stopping", "validation",
                "loss", "error", "cost", "objective", "function",
                "gradient", "descent", "optimizer", "adam", "sgd",
                "momentum", "learning rate", "batch size", "epoch", "iteration",
                "convergence", "divergence", "stability", "robustness", "reliability",
                "performance", "metric", "evaluation", "assessment", "measurement",
                "deployment", "inference", "prediction", "scoring", "serving",
                "monitoring", "tracking", "logging", "alerting", "maintenance"
            ],
            "data_mining": [
                "mine", "extract", "pattern", "discover", "insight", "trend", "anomaly",
                "outlier", "cluster", "classification", "association", "sequence", "text mining",
                "exploration", "discovery", "investigation", "analysis", "examination",
                "pattern", "recognition", "identification", "detection", "discovery",
                "association", "correlation", "relationship", "connection", "link",
                "sequence", "temporal", "time series", "chronological", "sequential",
                "text", "nlp", "natural language", "processing", "understanding",
                "tokenization", "stemming", "lemmatization", "parsing", "tagging",
                "sentiment", "emotion", "tone", "mood", "attitude",
                "topic", "modeling", "extraction", "classification", "categorization",
                "entity", "recognition", "extraction", "linking", "resolution",
                "keyword", "extraction", "selection", "ranking", "scoring",
                "summarization", "compression", "condensation", "abstraction", "extraction",
                "translation", "localization", "adaptation", "customization", "personalization",
                "search", "retrieval", "indexing", "ranking", "relevance",
                "recommendation", "suggestion", "prediction", "forecasting", "planning",
                "visualization", "representation", "display", "presentation", "communication",
                "evaluation", "assessment", "measurement", "validation", "verification",
                "deployment", "integration", "implementation", "application", "utilization"
            ],
            "report_generation": [
                "report", "generate", "create", "produce", "output", "export",
                "document", "record", "log", "track", "monitor",
                "template", "format", "layout", "design", "structure",
                "section", "chapter", "part", "component", "element",
                "header", "footer", "title", "subtitle", "caption",
                "table", "chart", "graph", "diagram", "figure",
                "summary", "abstract", "overview", "synopsis", "digest",
                "content", "material", "information", "data", "facts",
                "analysis", "evaluation", "assessment", "review", "examination",
                "conclusion", "recommendation", "suggestion", "proposal", "solution",
                "appendix", "reference", "citation", "bibliography", "glossary",
                "index", "table of contents", "navigation", "structure", "organization",
                "style", "formatting", "typography", "font", "color",
                "branding", "identity", "logo", "theme", "template",
                "automation", "scheduling", "triggering", "distribution", "delivery",
                "sharing", "collaboration", "review", "approval", "signoff",
                "version", "revision", "history", "tracking", "control",
                "security", "access", "permission", "privacy", "confidentiality",
                "archive", "storage", "retrieval", "backup", "recovery",
                "export", "import", "conversion", "transformation", "migration",
                "integration", "connection", "interface", "api", "service",
                "notification", "alert", "reminder", "update", "status"
            ],
            "trend_analysis": [
                "trend", "pattern", "change", "over time", "growth", "decline",
                "seasonal", "cyclical", "forecast", "prediction", "projection",
                "time series", "temporal", "chronological", "sequential", "historical",
                "growth", "decline", "increase", "decrease", "fluctuation",
                "seasonal", "periodic", "cyclic", "recurring", "regular",
                "trend", "direction", "movement", "progression", "development",
                "forecast", "prediction", "projection", "estimation", "anticipation",
                "analysis", "examination", "investigation", "study", "research",
                "comparison", "contrast", "correlation", "relationship", "association",
                "visualization", "chart", "graph", "plot", "display",
                "metric", "measure", "indicator", "gauge", "score",
                "statistical", "mathematical", "quantitative", "numerical", "analytical",
                "regression", "correlation", "covariance", "variance", "deviation",
                "smoothing", "averaging", "filtering", "normalization", "standardization",
                "decomposition", "separation", "isolation", "extraction", "identification",
                "validation", "verification", "confirmation", "certification", "authentication",
                "interpretation", "explanation", "understanding", "comprehension", "insight",
                "report", "documentation", "presentation", "communication", "sharing",
                "decision", "action", "implementation", "execution", "application",
                "monitoring", "tracking", "observation", "supervision", "oversight",
                "adjustment", "modification", "adaptation", "refinement", "optimization"
            ],
            "data_validation": [
                "validate", "verify", "check", "quality", "accuracy", "integrity",
                "consistency", "completeness", "format", "schema", "constraint",
                "rule", "policy", "standard", "requirement", "specification",
                "format", "structure", "schema", "template", "pattern",
                "type", "datatype", "format", "encoding", "representation",
                "constraint", "restriction", "limitation", "boundary", "condition",
                "validation", "verification", "confirmation", "certification", "authentication",
                "quality", "integrity", "consistency", "completeness", "accuracy",
                "error", "exception", "anomaly", "deviation", "violation",
                "check", "inspection", "examination", "review", "audit",
                "test", "verification", "validation", "confirmation", "certification",
                "documentation", "recording", "logging", "tracking", "monitoring",
                "report", "notification", "alert", "warning", "error",
                "correction", "fix", "repair", "resolution", "remediation",
                "prevention", "avoidance", "mitigation", "reduction", "elimination",
                "automation", "mechanization", "systematization", "standardization", "regularization",
                "integration", "connection", "interface", "api", "service",
                "security", "protection", "privacy", "confidentiality", "secrecy",
                "compliance", "conformity", "adherence", "observance", "following",
                "maintenance", "support", "service", "care", "tending",
                "improvement", "enhancement", "optimization", "refinement", "perfection"
            ],
            "performance_metrics": [
                "metrics", "kpi", "measure", "benchmark", "score", "rating",
                "efficiency", "productivity", "throughput", "latency", "response time",
                "utilization", "usage", "consumption", "allocation", "distribution",
                "performance", "efficiency", "effectiveness", "productivity", "output",
                "speed", "velocity", "acceleration", "momentum", "inertia",
                "capacity", "capability", "potential", "ability", "power",
                "resource", "asset", "property", "possession", "holding",
                "cost", "expense", "investment", "return", "value",
                "quality", "excellence", "superiority", "premium", "grade",
                "reliability", "dependability", "trustworthiness", "consistency", "stability",
                "availability", "accessibility", "readiness", "preparedness", "willingness",
                "scalability", "expandability", "extensibility", "flexibility", "adaptability",
                "maintainability", "sustainability", "durability", "longevity", "persistence",
                "security", "safety", "protection", "defense", "shield",
                "compliance", "conformity", "adherence", "observance", "following",
                "satisfaction", "happiness", "contentment", "fulfillment", "gratification",
                "growth", "development", "progress", "advancement", "improvement",
                "innovation", "creativity", "originality", "novelty", "uniqueness",
                "competitiveness", "advantage", "superiority", "excellence", "leadership",
                "monitoring", "tracking", "observation", "supervision", "oversight",
                "reporting", "documentation", "recording", "logging", "tracking",
                "analysis", "evaluation", "assessment", "review", "examination",
                "optimization", "improvement", "enhancement", "refinement", "perfection"
            ],
            "data_transformation": [
                "transform", "convert", "format", "structure", "reshape",
                "aggregate", "group", "pivot", "join", "merge",
                "split", "normalize", "denormalize", "standardize", "regularize",
                "clean", "preprocess", "filter", "remove", "format",
                "validate", "verify", "check", "quality", "integrity",
                "consistency", "completeness", "accuracy", "precision", "recall",
                "type", "datatype", "format", "encoding", "representation",
                "schema", "structure", "organization", "arrangement", "composition",
                "mapping", "translation", "conversion", "transformation", "change",
                "calculation", "computation", "processing", "manipulation", "operation",
                "aggregation", "summarization", "condensation", "compression", "reduction",
                "enrichment", "enhancement", "augmentation", "supplementation", "complementation",
                "validation", "verification", "confirmation", "certification", "authentication",
                "documentation", "recording", "logging", "tracking", "monitoring",
                "automation", "mechanization", "systematization", "standardization", "regularization",
                "integration", "connection", "interface", "api", "service",
                "security", "protection", "privacy", "confidentiality", "secrecy",
                "performance", "efficiency", "optimization", "improvement", "enhancement",
                "maintenance", "support", "service", "care", "tending",
                "versioning", "history", "tracking", "control", "management",
                "deployment", "release", "publish", "distribute", "deliver",
                "testing", "verification", "validation", "certification", "quality",
                "monitoring", "tracking", "observation", "supervision", "oversight",
                "reporting", "documentation", "recording", "logging", "tracking"
            ]
        },
        "document_management": {
            "file_organization": [
                "organize", "structure", "categorize", "sort", "arrange",
                "group", "folder", "directory", "hierarchy", "taxonomy",
                "metadata", "tag", "label", "classify", "categorize",
                "index", "catalog", "inventory", "registry", "directory",
                "naming", "convention", "standard", "format", "pattern",
                "version", "revision", "history", "tracking", "control",
                "access", "permission", "authorization", "authentication", "security",
                "sharing", "collaboration", "cooperation", "coordination", "synchronization",
                "backup", "recovery", "restore", "archive", "storage",
                "search", "find", "locate", "discover", "retrieve",
                "filter", "sort", "order", "arrange", "organize",
                "view", "display", "show", "present", "exhibit",
                "export", "import", "transfer", "migrate", "convert",
                "compress", "decompress", "archive", "extract", "package",
                "encrypt", "decrypt", "secure", "protect", "safeguard",
                "validate", "verify", "check", "quality", "integrity",
                "maintain", "preserve", "conserve", "sustain", "keep",
                "monitor", "track", "observe", "supervise", "oversee",
                "report", "document", "record", "log", "track",
                "automate", "mechanize", "systematize", "standardize", "regularize",
                "integrate", "connect", "link", "join", "combine",
                "optimize", "improve", "enhance", "better", "perfect",
                "maintenance", "support", "service", "care", "tending"
            ]
        },
        "communication": {
            "message_composition": ["compose", "write", "draft", "create", "message", "email"],
            "notification_setup": ["notify", "alert", "reminder", "notification", "announce", "broadcast"],
            "team_collaboration": ["team", "collaborate", "work", "together", "coordinate", "share"],
            "feedback_collection": ["feedback", "survey", "poll", "response", "opinion", "review"],
            "status_update": ["status", "update", "progress", "report", "check", "monitor"],
            "meeting_coordination": ["meeting", "schedule", "coordinate", "arrange", "plan", "organize"],
            "client_communication": ["client", "customer", "support", "service", "help", "assist"],
            "announcement_broadcast": ["announce", "broadcast", "notify", "inform", "share", "publish"],
            "chat_management": ["chat", "message", "conversation", "discussion", "talk", "communicate"],
            "communication_policy": ["policy", "guideline", "rule", "standard", "procedure", "protocol"]
        },
        "task_management": {
            "task_creation": ["create", "add", "new", "task", "todo", "item"],
            "priority_setting": ["priority", "important", "urgent", "critical", "high", "low"],
            "deadline_tracking": ["deadline", "due", "date", "time", "schedule", "timeline"],
            "resource_allocation": ["resource", "allocate", "assign", "distribute", "manage", "plan"],
            "progress_monitoring": ["progress", "track", "monitor", "status", "update", "check"],
            "task_delegation": ["delegate", "assign", "handover", "transfer", "distribute", "share"],
            "workflow_optimization": ["workflow", "process", "optimize", "improve", "efficiency", "streamline"],
            "milestone_tracking": ["milestone", "goal", "target", "objective", "achievement", "progress"],
            "time_management": ["time", "schedule", "calendar", "plan", "organize", "manage"],
            "task_automation": ["automate", "automatic", "routine", "recurring", "scheduled", "trigger"]
        },
        "learning_education": {
            "tutorial_request": ["tutorial", "guide", "learn", "teach", "instruction", "lesson"],
            "concept_explanation": ["explain", "concept", "understand", "learn", "teach", "clarify"],
            "skill_development": ["skill", "develop", "learn", "improve", "enhance", "practice"],
            "best_practices": ["practice", "standard", "guideline", "recommend", "suggest", "advise"],
            "learning_resources": ["resource", "material", "content", "reference", "guide", "tutorial"],
            "knowledge_sharing": ["share", "knowledge", "information", "learn", "teach", "explain"],
            "training_material": ["training", "material", "content", "course", "lesson", "module"],
            "certification_prep": ["certification", "exam", "test", "prepare", "study", "practice"],
            "mentoring_guidance": ["mentor", "guide", "advise", "support", "help", "assist"],
            "learning_assessment": ["assess", "evaluate", "test", "measure", "check", "verify"]
        },
        "technical_support": {
            "error_resolution": ["error", "fix", "resolve", "solve", "troubleshoot", "debug"],
            "system_troubleshooting": ["troubleshoot", "debug", "fix", "resolve", "problem", "issue"],
            "configuration_help": ["configure", "setup", "install", "settings", "options", "parameters"],
            "performance_optimization": ["performance", "optimize", "improve", "speed", "efficiency", "enhance"],
            "compatibility_issues": ["compatible", "version", "system", "platform", "environment", "requirement"],
            "installation_support": ["install", "setup", "configure", "deploy", "initialize", "setup"],
            "upgrade_assistance": ["upgrade", "update", "version", "migrate", "transition", "change"],
            "security_concerns": ["security", "protect", "secure", "safety", "privacy", "threat"],
            "backup_recovery": ["backup", "restore", "recover", "save", "protect", "preserve"],
            "maintenance_support": ["maintain", "support", "service", "check", "monitor", "update"]
        },
        "information_query": {
            "fact_verification": ["verify", "check", "confirm", "validate", "authenticate", "prove"],
            "process_inquiry": ["process", "procedure", "method", "way", "how", "steps"],
            "status_check": ["status", "check", "verify", "confirm", "current", "state"],
            "resource_location": ["find", "locate", "search", "where", "location", "path"],
            "policy_clarification": ["policy", "rule", "guideline", "clarify", "explain", "understand"],
            "technical_details": ["technical", "specification", "detail", "information", "documentation"],
            "availability_check": ["available", "check", "verify", "confirm", "status", "state"],
            "requirement_gathering": ["requirement", "need", "specification", "detail", "information"],
            "cost_estimation": ["cost", "price", "estimate", "budget", "expense", "charge"],
            "compatibility_check": ["compatible", "check", "verify", "confirm", "test", "validate"]
        },
        "content_creation": {
            "content_writing": [
                "write", "create", "compose", "draft", "content", "text",
                "article", "blog", "post", "story", "essay", "copy",
                "document", "script", "screenplay", "novel", "book",
                "poem", "poetry", "prose", "fiction", "non-fiction",
                "biography", "autobiography", "memoir", "journal",
                "diary", "letter", "email", "report", "summary",
                "review", "critique", "analysis", "commentary",
                "editorial", "news", "journalism", "press", "media",
                "publication", "publishing", "ghostwriting", "copywriting",
                "technical writing", "creative writing", "academic writing",
                "research paper", "thesis", "dissertation", "white paper",
                "case study", "whitepaper", "ebook", "guide", "tutorial",
                "how-to", "manual", "documentation", "translation",
                "localization", "proofreading", "editing", "formatting",
                "layout", "social media", "tweet", "post", "update",
                "status", "caption", "headline", "title", "subtitle",
                "tagline", "slogan", "catchphrase", "description",
                "bio", "profile", "about", "summary", "abstract",
                "outline", "draft", "version", "revision", "edit",
                "rewrite", "polish", "refine", "enhance", "improve",
                "optimize", "seo", "keyword", "tag", "category",
                "topic", "theme", "style", "tone", "voice", "audience",
                "purpose", "goal", "objective", "format", "structure",
                "organization", "layout", "design", "template",
                "style guide", "branding", "identity", "message",
                "communication", "expression", "narrative", "storytelling",
                "content strategy", "content plan", "content calendar",
                "schedule", "deadline", "timeline", "milestone",
                "deliverable", "output"
            ],
            "blog_writing": [
                "blog", "post", "article", "entry", "update", "content",
                "write", "create", "publish", "post", "share", "social",
                "media", "platform", "website", "site", "web", "online",
                "digital", "internet", "web", "online", "digital", "internet",
                "topic", "subject", "theme", "category", "tag", "keyword",
                "seo", "search", "engine", "optimization", "ranking",
                "traffic", "visitor", "reader", "audience", "follower",
                "subscriber", "comment", "feedback", "engagement", "interaction",
                "share", "like", "follow", "subscribe", "notification",
                "alert", "reminder", "schedule", "calendar", "timeline",
                "deadline", "publish", "release", "launch", "go live",
                "draft", "edit", "revise", "proofread", "format",
                "style", "design", "layout", "template", "theme",
                "header", "footer", "sidebar", "widget", "plugin",
                "feature", "functionality", "capability", "option",
                "setting", "configuration", "customization", "personalization"
            ],
            "article_writing": [
                "article", "write", "create", "compose", "draft", "content",
                "text", "story", "news", "report", "feature", "column",
                "editorial", "opinion", "analysis", "review", "critique",
                "commentary", "journalism", "press", "media", "publication",
                "publishing", "magazine", "newspaper", "journal", "periodical",
                "publication", "issue", "edition", "volume", "number",
                "section", "category", "topic", "subject", "theme",
                "headline", "title", "subtitle", "tagline", "slogan",
                "catchphrase", "description", "summary", "abstract",
                "outline", "draft", "version", "revision", "edit",
                "rewrite", "polish", "refine", "enhance", "improve",
                "optimize", "seo", "keyword", "tag", "category",
                "topic", "theme", "style", "tone", "voice", "audience",
                "purpose", "goal", "objective", "format", "structure",
                "organization", "layout", "design", "template",
                "style guide", "branding", "identity", "message",
                "communication", "expression", "narrative", "storytelling"
            ],
            "social_media_content": [
                "social", "media", "platform", "post", "update", "status",
                "tweet", "share", "like", "follow", "comment", "engagement",
                "interaction", "audience", "follower", "subscriber", "fan",
                "community", "network", "connection", "relationship", "reach",
                "impression", "view", "click", "traffic", "visitor", "user",
                "profile", "account", "page", "channel", "feed", "timeline",
                "stream", "content", "media", "image_generation", "photo", "video",
                "audio", "text", "caption", "hashtag", "mention", "tag",
                "link", "url", "website", "blog", "article", "story",
                "news", "update", "announcement", "promotion", "campaign",
                "marketing", "advertising", "branding", "message", "communication",
                "strategy", "plan", "calendar", "schedule", "timeline",
                "deadline", "publish", "release", "launch", "go live",
                "draft", "edit", "revise", "proofread", "format",
                "style", "design", "layout", "template", "theme"
            ],
            "technical_writing": [
                "technical", "writing", "documentation", "manual", "guide",
                "tutorial", "how-to", "instruction", "procedure", "process",
                "step", "method", "approach", "technique", "strategy",
                "solution", "answer", "explanation", "clarification", "detail",
                "specification", "requirement", "standard", "protocol",
                "format", "structure", "organization", "layout", "design",
                "template", "style", "tone", "voice", "audience", "user",
                "reader", "customer", "client", "stakeholder", "developer",
                "engineer", "technician", "specialist", "expert", "professional",
                "code", "programming", "software", "hardware", "system",
                "application", "platform", "tool", "utility", "function",
                "feature", "capability", "option", "setting", "configuration",
                "parameter", "variable", "constant", "value", "data",
                "information", "knowledge", "expertise", "skill", "ability",
                "competency", "proficiency", "mastery", "experience", "practice"
            ],
            "content_editing": [
                "edit", "modify", "change", "update", "revise", "correct",
                "proofread", "review", "check", "verify", "validate",
                "approve", "assess", "evaluate", "improve", "enhance",
                "polish", "refine", "perfect", "finalize", "complete",
                "format", "style", "layout", "design", "structure",
                "organize", "arrange", "compose", "reorganize", "restructure",
                "rewrite", "rephrase", "paraphrase", "summarize", "condense",
                "expand", "elaborate", "develop", "build", "construct",
                "compose", "craft", "create", "generate", "produce",
                "draft", "outline", "sketch", "plan", "prepare",
                "version", "revision", "iteration", "draft", "copy",
                "manuscript", "document", "text", "content", "material"
            ],
            "content_planning": [
                "plan", "strategy", "schedule", "organize", "structure",
                "outline", "framework", "blueprint", "roadmap", "timeline",
                "calendar", "agenda", "schedule", "deadline", "milestone",
                "goal", "objective", "target", "aim", "purpose",
                "intention", "vision", "mission", "strategy", "approach",
                "method", "technique", "process", "workflow", "pipeline",
                "content calendar", "editorial calendar", "publishing schedule",
                "content strategy", "content plan", "content roadmap",
                "content framework", "content structure", "content organization",
                "content workflow", "content process", "content pipeline",
                "content management", "content governance", "content policy",
                "content guidelines", "content standards", "content rules",
                "content requirements", "content specifications", "content criteria"
            ],
            "content_optimization": [
                "optimize", "improve", "enhance", "better", "quality",
                "performance", "efficiency", "effectiveness", "impact",
                "engagement", "interaction", "response", "feedback",
                "seo", "search", "engine", "optimization", "ranking",
                "traffic", "visitor", "viewer", "reader", "audience",
                "reach", "exposure", "visibility", "discovery", "findability",
                "accessibility", "usability", "readability", "clarity",
                "comprehension", "understanding", "retention", "memory",
                "recall", "recognition", "awareness", "knowledge", "learning",
                "education", "information", "communication", "message",
                "content", "material", "resource", "asset", "property"
            ],
            "content_distribution": [
                "distribute", "share", "publish", "broadcast", "spread",
                "send", "deliver", "transmit", "disseminate", "circulate",
                "propagate", "promote", "market", "advertise", "publicize",
                "announce", "declare", "proclaim", "herald", "signal",
                "indicate", "show", "display", "exhibit", "present",
                "demonstrate", "illustrate", "exemplify", "manifest",
                "channel", "medium", "platform", "vehicle", "conduit",
                "pathway", "route", "course", "direction", "way",
                "method", "means", "mechanism", "system", "process",
                "procedure", "protocol", "standard", "practice", "policy"
            ],
            "content_analysis": [
                "analyze", "evaluate", "assess", "measure", "track",
                "monitor", "observe", "watch", "supervise", "oversee",
                "review", "examine", "inspect", "scrutinize", "study",
                "research", "investigate", "explore", "probe", "query",
                "metrics", "kpi", "indicator", "measure", "gauge",
                "statistic", "data", "information", "evidence", "proof",
                "result", "outcome", "output", "product", "deliverable",
                "performance", "efficiency", "effectiveness", "impact",
                "influence", "effect", "consequence", "result", "outcome",
                "feedback", "response", "reaction", "reception", "reception"
            ],
            "content_maintenance": [
                "maintain", "update", "manage", "preserve", "keep",
                "sustain", "support", "service", "care", "tend",
                "nurture", "cultivate", "develop", "grow", "evolve",
                "progress", "advance", "improve", "enhance", "better",
                "version", "revision", "edition", "iteration", "update",
                "upgrade", "refresh", "renew", "revitalize", "rejuvenate",
                "restore", "repair", "fix", "correct", "rectify",
                "adjust", "modify", "change", "alter", "transform",
                "convert", "adapt", "accommodate", "suit", "fit",
                "match", "align", "synchronize", "coordinate", "harmonize"
            ],
            "content_audit": [
                "audit", "review", "examine", "inspect", "scrutinize",
                "analyze", "evaluate", "assess", "measure", "gauge",
                "check", "verify", "validate", "confirm", "certify",
                "inventory", "catalog", "list", "record", "register",
                "document", "archive", "store", "save", "preserve",
                "maintain", "manage", "organize", "structure", "arrange",
                "classify", "categorize", "sort", "order", "rank",
                "prioritize", "value", "worth", "importance", "significance",
                "relevance", "pertinence", "applicability", "suitability", "fitness"
            ],
            "content_strategy": [
                "strategy", "plan", "approach", "method", "technique",
                "process", "procedure", "protocol", "standard", "practice",
                "policy", "guideline", "rule", "regulation", "requirement",
                "specification", "criterion", "standard", "benchmark", "target",
                "goal", "objective", "aim", "purpose", "intention",
                "vision", "mission", "philosophy", "principle", "value",
                "content strategy", "content plan", "content approach",
                "content method", "content technique", "content process",
                "content procedure", "content protocol", "content standard",
                "content practice", "content policy", "content guideline",
                "content rule", "content regulation", "content requirement",
                "content specification", "content criterion", "content standard",
                "content benchmark", "content target", "content goal"
            ]
        },
        "system_operation": {
            "system_monitoring": ["monitor", "track", "watch", "observe", "check", "supervise"],
            "resource_management": ["resource", "manage", "allocate", "control", "optimize", "utilize"],
            "performance_tuning": ["performance", "tune", "optimize", "improve", "enhance", "speed"],
            "security_management": ["security", "protect", "secure", "defend", "safeguard", "shield"],
            "backup_management": ["backup", "restore", "save", "protect", "preserve", "maintain"],
            "user_management": ["user", "account", "access", "permission", "role", "profile"],
            "system_maintenance": ["maintain", "service", "update", "check", "repair", "fix"],
            "configuration_management": ["configure", "setup", "settings", "options", "parameters"],
            "capacity_planning": ["capacity", "plan", "forecast", "predict", "estimate", "project"],
            "incident_response": ["incident", "response", "handle", "manage", "resolve", "address"]
        },
        "research_analysis": {
            "market_research": ["market", "research", "study", "analyze", "investigate", "survey"],
            "competitor_analysis": ["competitor", "rival", "compare", "analyze", "evaluate", "assess"],
            "technology_research": ["technology", "research", "study", "investigate", "explore", "analyze"],
            "trend_analysis": ["trend", "pattern", "change", "movement", "direction", "development"],
            "feasibility_study": ["feasible", "possible", "viable", "practical", "realistic", "achievable"],
            "impact_analysis": ["impact", "effect", "influence", "consequence", "result", "outcome"],
            "requirement_analysis": ["requirement", "need", "specification", "detail", "analysis"],
            "risk_assessment": ["risk", "threat", "danger", "vulnerability", "exposure", "assessment"],
            "performance_analysis": ["performance", "analyze", "evaluate", "assess", "measure", "track"],
            "cost_benefit_analysis": ["cost", "benefit", "value", "return", "investment", "analysis"]
        },
        "automation_workflow": {
            "process_automation": [
                "automate", "process", "routine", "task", "workflow", "pipeline",
                "mechanize", "systematize", "standardize", "regularize", "institutionalize",
                "streamline", "simplify", "optimize", "efficiency", "productivity",
                "reduce", "minimize", "eliminate", "remove", "eradicate",
                "accelerate", "speed", "quicken", "expedite", "facilitate",
                "enable", "empower", "strengthen", "boost", "enhance",
                "implement", "execute", "perform", "conduct", "carry",
                "operate", "run", "function", "work", "act",
                "control", "manage", "direct", "guide", "steer",
                "coordinate", "synchronize", "harmonize", "align", "balance",
                "integrate", "unify", "consolidate", "combine", "merge",
                "connect", "link", "join", "bind", "couple",
                "schedule", "time", "plan", "arrange", "organize",
                "sequence", "order", "prioritize", "rank", "classify",
                "monitor", "track", "measure", "evaluate", "assess",
                "analyze", "review", "examine", "inspect", "audit",
                "improve", "enhance", "develop", "progress", "advance",
                "innovate", "create", "design", "engineer", "implement"
            ],
            "workflow_design": [
                "workflow", "process", "design", "create", "build", "develop",
                "architecture", "structure", "framework", "blueprint", "template",
                "pattern", "model", "schema", "format", "layout",
                "organization", "arrangement", "composition", "configuration", "setup",
                "sequence", "order", "progression", "flow", "movement",
                "transition", "transformation", "conversion", "change", "evolution",
                "integration", "connection", "linkage", "coupling", "binding",
                "coordination", "synchronization", "harmonization", "alignment", "balance",
                "optimization", "improvement", "enhancement", "refinement", "perfection",
                "automation", "mechanization", "systematization", "standardization", "regularization",
                "implementation", "execution", "performance", "operation", "functioning",
                "management", "control", "direction", "guidance", "supervision",
                "monitoring", "tracking", "measurement", "evaluation", "assessment",
                "analysis", "review", "examination", "inspection", "audit",
                "documentation", "recording", "logging", "tracking", "monitoring",
                "testing", "validation", "verification", "confirmation", "certification",
                "maintenance", "support", "service", "care", "tending"
            ],
            "integration_setup": [
                "integrate", "connect", "link", "combine", "merge", "unite",
                "interface", "interact", "interoperate", "communicate", "exchange",
                "synchronize", "harmonize", "align", "balance", "coordinate",
                "unify", "consolidate", "amalgamate", "incorporate", "assimilate",
                "connect", "couple", "bind", "join", "attach",
                "bridge", "gateway", "portal", "entry", "access",
                "protocol", "standard", "format", "specification", "requirement",
                "compatibility", "interoperability", "conformity", "compliance", "adherence",
                "authentication", "authorization", "security", "protection", "safeguard",
                "encryption", "decryption", "cipher", "code", "key",
                "transmission", "transfer", "transport", "convey", "deliver",
                "reception", "receipt", "acceptance", "acknowledgment", "confirmation",
                "validation", "verification", "confirmation", "certification", "authentication",
                "error", "handling", "management", "resolution", "recovery",
                "monitoring", "tracking", "logging", "recording", "documentation",
                "performance", "efficiency", "optimization", "improvement", "enhancement",
                "maintenance", "support", "service", "care", "tending",
                "upgrade", "update", "modify", "change", "alter",
                "configuration", "setup", "installation", "deployment", "implementation"
            ],
            "trigger_configuration": [
                "trigger", "event", "action", "start", "initiate", "launch",
                "activate", "enable", "engage", "set", "establish",
                "schedule", "time", "plan", "arrange", "organize",
                "sequence", "order", "progression", "flow", "movement",
                "condition", "state", "status", "situation", "circumstance",
                "threshold", "limit", "boundary", "range", "scope",
                "criterion", "standard", "requirement", "specification", "parameter",
                "input", "output", "signal", "message", "communication",
                "response", "reaction", "feedback", "return", "reply",
                "execution", "performance", "operation", "functioning", "running",
                "control", "management", "direction", "guidance", "supervision",
                "monitoring", "tracking", "logging", "recording", "documentation",
                "validation", "verification", "confirmation", "certification", "authentication",
                "error", "handling", "management", "resolution", "recovery",
                "security", "protection", "safeguard", "defense", "shield",
                "performance", "efficiency", "optimization", "improvement", "enhancement",
                "maintenance", "support", "service", "care", "tending",
                "configuration", "setup", "installation", "deployment", "implementation"
            ],
            "reporting_automation": [
                "report", "generate", "create", "produce", "output", "export",
                "document", "record", "log", "track", "monitor",
                "measure", "quantify", "calculate", "compute", "process",
                "analyze", "evaluate", "assess", "review", "examine",
                "summarize", "condense", "abstract", "digest", "synopsis",
                "present", "display", "show", "exhibit", "demonstrate",
                "visualize", "illustrate", "graph", "chart", "plot",
                "format", "style", "layout", "design", "structure",
                "template", "model", "pattern", "schema", "framework",
                "schedule", "time", "plan", "arrange", "organize",
                "distribute", "share", "send", "deliver", "transmit",
                "archive", "store", "save", "preserve", "maintain",
                "retrieve", "access", "fetch", "obtain", "acquire",
                "filter", "sort", "organize", "arrange", "order",
                "search", "find", "locate", "discover", "identify",
                "validate", "verify", "confirm", "certify", "authenticate",
                "security", "protection", "privacy", "confidentiality", "secrecy",
                "performance", "efficiency", "optimization", "improvement", "enhancement",
                "maintenance", "support", "service", "care", "tending",
                "configuration", "setup", "installation", "deployment", "implementation"
            ],
            "maintenance_automation": [
                "maintain", "service", "update", "check", "repair", "fix",
                "preserve", "conserve", "sustain", "keep", "retain",
                "support", "assist", "help", "aid", "facilitate",
                "monitor", "track", "watch", "observe", "supervise",
                "inspect", "examine", "review", "audit", "assess",
                "evaluate", "measure", "gauge", "quantify", "qualify",
                "analyze", "investigate", "probe", "explore", "research",
                "detect", "identify", "recognize", "discover", "find",
                "prevent", "avoid", "avert", "forestall", "preclude",
                "protect", "defend", "guard", "shield", "safeguard",
                "restore", "recover", "rehabilitate", "reconstruct", "rebuild",
                "improve", "enhance", "better", "perfect", "refine",
                "optimize", "streamline", "simplify", "efficiency", "performance",
                "update", "upgrade", "modify", "change", "alter",
                "configure", "setup", "install", "deploy", "implement",
                "document", "record", "log", "track", "monitor",
                "schedule", "time", "plan", "arrange", "organize",
                "automate", "mechanize", "systematize", "standardize", "regularize",
                "integrate", "unify", "consolidate", "combine", "merge",
                "coordinate", "synchronize", "harmonize", "align", "balance"
            ]
        },
        "security_compliance": {
            "security_audit": ["audit", "check", "verify", "validate", "assess", "evaluate"],
            "compliance_check": ["comply", "follow", "adhere", "conform", "meet", "satisfy"],
            "risk_assessment": ["risk", "threat", "danger", "vulnerability", "exposure", "assessment"],
            "policy_enforcement": ["policy", "rule", "enforce", "implement", "apply", "execute"],
            "access_management": ["access", "permission", "control", "manage", "restrict", "grant"],
            "security_training": ["train", "educate", "teach", "learn", "security", "awareness"],
            "incident_response": ["incident", "response", "handle", "manage", "resolve", "address"],
            "vulnerability_assessment": ["vulnerability", "weakness", "threat", "risk", "exposure"],
            "security_reporting": ["report", "document", "record", "log", "track", "monitor"],
            "compliance_documentation": ["document", "record", "compliance", "evidence", "proof"]
        },
        "resource_management": {
            "resource_allocation": ["allocate", "assign", "distribute", "manage", "control", "plan"],
            "capacity_planning": ["capacity", "plan", "forecast", "predict", "estimate", "project"],
            "resource_optimization": ["optimize", "improve", "enhance", "efficiency", "utilization"],
            "inventory_management": ["inventory", "stock", "supply", "manage", "track", "control"],
            "budget_planning": ["budget", "plan", "forecast", "estimate", "project", "allocate"],
            "vendor_management": ["vendor", "supplier", "provider", "manage", "control", "coordinate"],
            "license_management": ["license", "permit", "authorization", "manage", "control", "track"],
            "asset_tracking": ["asset", "track", "monitor", "manage", "control", "supervise"],
            "resource_forecasting": ["forecast", "predict", "estimate", "project", "plan", "anticipate"],
            "utilization_monitoring": ["utilize", "use", "monitor", "track", "measure", "assess"]
        },
        "problem_solving": {
            "issue_identification": ["identify", "find", "detect", "discover", "locate", "spot"],
            "root_cause_analysis": ["root", "cause", "source", "origin", "reason", "analysis"],
            "solution_design": ["solution", "design", "create", "develop", "build", "implement"],
            "implementation_planning": ["implement", "execute", "carry", "perform", "conduct", "apply"],
            "impact_assessment": ["impact", "effect", "influence", "consequence", "result", "outcome"],
            "alternative_analysis": ["alternative", "option", "choice", "possibility", "solution"],
            "risk_mitigation": ["risk", "threat", "mitigate", "reduce", "minimize", "prevent"],
            "solution_validation": ["validate", "verify", "confirm", "test", "check", "ensure"],
            "problem_prevention": ["prevent", "avoid", "stop", "block", "deter", "thwart"],
            "knowledge_capture": ["knowledge", "capture", "record", "document", "store", "save"]
        }
    }
    
    def __init__(self, confidence_threshold: float = 0.3):
        """Initialize the intent classifier.
        
        Args:
            confidence_threshold: Minimum confidence score for classification (default: 0.3)
        """
        self.confidence_threshold = confidence_threshold
        self.sub_intent_threshold = 0.05  # Even lower threshold for sub-intents
        self.log_file = Path("logs/uncertain_predictions.jsonl")
        self.log_file.parent.mkdir(exist_ok=True)
        logger.info("Intent classifier initialized with keyword matching")
    
    def _calculate_keyword_match_score(self, text: str, keywords: List[str]) -> float:
        """Calculate the confidence score based on keyword matches.
        
        Args:
            text: Input text to analyze
            keywords: List of keywords to match against
            
        Returns:
            float: Confidence score between 0 and 1
        """
        text = text.lower()
        text_words = set(text.split())
        
        # Track both exact and partial matches
        exact_matches = 0
        partial_matches = 0
        
        for keyword in keywords:
            keyword = keyword.lower()
            keyword_words = set(keyword.split())
            
            # Check for exact phrase match
            if f" {keyword} " in f" {text} " or text.startswith(keyword + " ") or text.endswith(" " + keyword):
                exact_matches += 4  # Increased weight for exact matches
            # Check for word boundary matches
            elif any(word in text_words for word in keyword_words):
                partial_matches += 2
            # Check for substring matches
            elif keyword in text:
                partial_matches += 1
        
        # Calculate weighted score with adjusted weights
        total_matches = exact_matches + partial_matches
        # Normalize by the number of keywords, but cap at 1.0
        score = min(total_matches / (len(keywords) * 0.3), 1.0) if keywords else 0.0
        return score
    
    def classify_intent(self, text: str) -> IntentResult:
        """Classify the given text into main intent and sub-intents using keyword matching.
        
        Args:
            text: The input text to classify
            
        Returns:
            IntentResult containing the classification results
        """
        try:
            # First classify main intent
            main_intent_scores = {
                intent: self._calculate_keyword_match_score(text, keywords)
                for intent, keywords in self.MAIN_INTENT_KEYWORDS.items()
            }
            
            # Get the main intent with highest score
            main_intent = max(main_intent_scores.items(), key=lambda x: x[1])
            main_intent_name = main_intent[0]
            main_confidence = main_intent[1]
            
            # Get sub-intents for the main intent
            sub_intents = []
            if main_intent_name in self.SUB_INTENT_KEYWORDS:
                sub_intent_scores = {
                    sub_intent: self._calculate_keyword_match_score(text, keywords)
                    for sub_intent, keywords in self.SUB_INTENT_KEYWORDS[main_intent_name].items()
                }
                
                # Get sub-intents with confidence above the lower sub-intent threshold
                # Sort by confidence score in descending order
                sorted_sub_intents = sorted(
                    [(sub_intent, score) for sub_intent, score in sub_intent_scores.items() if score >= self.sub_intent_threshold],
                    key=lambda x: x[1],
                    reverse=True
                )
                
                # Take top 5 sub-intents or all if less than 5
                sub_intents = [sub_intent for sub_intent, _ in sorted_sub_intents[:5]]
                
                # If no sub-intents meet the threshold but we have scores, take the highest ones
                if not sub_intents and sub_intent_scores:
                    # Get all sub-intents with any score > 0
                    valid_sub_intents = [(sub_intent, score) for sub_intent, score in sub_intent_scores.items() if score > 0]
                    if valid_sub_intents:
                        # Sort by score and take top 3
                        valid_sub_intents.sort(key=lambda x: x[1], reverse=True)
                        sub_intents = [sub_intent for sub_intent, _ in valid_sub_intents[:3]]
            
            # Determine if the result needs review
            needs_review = main_confidence < self.confidence_threshold
            
            # Log uncertain predictions
            if needs_review:
                self._log_uncertain_prediction(text, main_intent_name, main_confidence, sub_intents)
            
            return IntentResult(
                main_intent=main_intent_name,
                sub_intents=sub_intents,
                confidence=main_confidence,
                needs_review=needs_review
            )
            
        except Exception as e:
            logger.error(f"Error in intent classification: {str(e)}")
            return IntentResult(
                main_intent="information_query",
                sub_intents=[],
                confidence=0.0,
                needs_review=True
            )
    
    def _log_uncertain_prediction(self, text: str, main_intent: str, confidence: float, sub_intents: List[str]):
        """Log uncertain predictions for manual review.
        
        Args:
            text: The input text
            main_intent: The classified main intent
            confidence: The confidence score
            sub_intents: The classified sub-intents
        """
        try:
            log_entry = {
                "timestamp": str(datetime.now()),
                "text": text,
                "main_intent": main_intent,
                "confidence": confidence,
                "sub_intents": sub_intents
            }
            
            with open(self.log_file, "a") as f:
                f.write(json.dumps(log_entry) + "\n")
                
        except Exception as e:
            logger.error(f"Error logging uncertain prediction: {str(e)}") 