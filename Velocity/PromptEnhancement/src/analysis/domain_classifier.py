"""Domain classifier for prompt routing with enhanced keyword matching and context analysis."""

import re
from functools import lru_cache
import time
from typing import Dict, List, Set, Any, Optional, Tuple
import asyncio
import numpy as np
from collections import defaultdict, OrderedDict
import json
import os
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from concurrent.futures import ThreadPoolExecutor
from langchain_community.cache import InMemoryCache
import langchain
from src.cache.cache_config import DEFAULT_CACHE_TTL, DEFAULT_CACHE_SIZE
import logging
from src.analysis.intent_classifier import IntentResult

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Enable LangChain's in-memory cache
langchain.llm_cache = InMemoryCache()

class DomainClassifier:
    """Classifies prompts into domains using enhanced keyword matching and context analysis."""
    
    _instance = None

    @classmethod
    def get_instance(cls, *args, **kwargs):
        if cls._instance is None:
            cls._instance = cls(*args, **kwargs)
        return cls._instance
    
    # Optimization: Create a function to build domain keywords to eliminate duplicates
    def _build_domain_keywords(self):
        """Build optimized domain keywords dictionary with deduplication and frequency weighting."""
        # Raw keywords for each domain, to be optimized
        raw_keywords = {
            "content_creation": [
                "write", "article", "blog", "story", "essay", "content", "copy",
                "draft", "edit", "publish", "author", "post", "text", "document",
                "script", "screenplay", "novel", "book", "poem", "poetry", "prose",
                "fiction", "non-fiction", "biography", "autobiography", "memoir",
                "journal", "diary", "letter", "email", "report", "summary",
                "review", "critique", "analysis", "commentary", "editorial",
                "news", "journalism", "press", "media", "publication", "publishing",
                "ghostwriting", "copywriting", "technical writing", "creative writing",
                "academic writing", "research paper", "thesis", "dissertation",
                "white paper", "case study", "whitepaper", "ebook", "guide",
                "tutorial", "how-to", "manual", "documentation", "translation",
                "localization", "proofreading", "editing", "formatting", "layout",
                # Enhanced HR and business writing keywords
                "template", "letter template", "request letter", "leave request", 
                "formal letter", "business letter", "correspondence", "memo",
                "memorandum", "policy document", "procedure", "guidelines",
                "employee handbook", "hr document", "organizational document",
                "internal communication", "external communication", "notice",
                "announcement", "circular", "directive", "instruction sheet",
                "standard operating procedure", "sop", "process document",
                "workflow document", "training material", "user manual",
                "employee guide", "onboarding document", "orientation material",
                "performance review", "evaluation form", "feedback form",
                "application letter", "cover letter", "resignation letter",
                "recommendation letter", "reference letter", "testimonial",
                "complaint letter", "inquiry letter", "follow-up letter",
                "thank you letter", "invitation letter", "proposal letter",
                "agreement draft", "contract draft", "terms and conditions",
                "privacy policy", "disclaimer", "user agreement", "consent form",
                "job description", "role specification", "requirements document",
                "project brief", "creative brief", "content brief", "style guide",
                "brand guidelines", "communication strategy", "messaging framework"
            ],
            "music": [
                "music", "song", "track", "beat", "rhythm", "melody", "harmony",
                "lyrics", "verse", "chorus", "bridge", "hook", "riff", "sample",
                "producer", "artist", "singer", "rapper", "vocalist", "musician",
                "band", "orchestra", "ensemble", "concert", "performance", "live",
                "studio", "recording", "mix", "master", "audio", "sound", "bass",
                "treble", "tempo", "pitch", "scale", "chord", "note", "key",
                "genre", "style", "hip hop", "rap", "rock", "pop", "jazz",
                "classical", "electronic", "dance", "folk", "blues", "metal"
            ],
            "code": [
                "code", "programming", "develop", "bug", "fix", "implement", "test", "debug",
                "function", "class", "method", "api", "library", "framework", "dependency",
                "algorithm", "script", "software", "application", "backend", "frontend",
                "database", "query", "sql", "nosql", "server", "client", "deploy",
                "version", "control", "git", "repository", "commit", "branch", "merge",
                "refactor", "optimize", "performance", "security", "authentication",
                "authorization", "encryption", "decryption", "hash", "cryptography",
                "microservice", "container", "docker", "kubernetes", "cloud", "aws",
                "azure", "gcp", "devops", "ci", "cd", "pipeline", "automation",
                "syntax", "framework", "function", "frontend", "ui", "html", "javascript",
                "repository", "class", "test", "ethereum", "nosql", "fullstack", "django",
                "solidity", "algorithm", "ruby", "server", "cloud", "docker", "user interface",
                "postgresql", "laravel", "smart contract", "application", "software", "method",
                "vue", "unit test", "development", "express", "flask", "architecture",
                "blockchain", "python", "swift", "web", "css", "animation", "php", "node",
                "spring", "rails", "sql", "code", "azure", "ux", "redis", "branch", "mobile",
                "script", "object", "system", "ai", "web3", "deployment", "analytics",
                "swiftui", "widget", "interface design", "ios", "java", "variable",
                "pull request", "data science", "debug", "app", "api", "coding",
                "machine learning", "library", "react", "program", "macos", "aws",
                "interface", "database", "kubernetes", "programming", "module", "angular",
                "bitcoin", "artificial intelligence", "commit", "gcp", "crypto", "package",
                "mongodb", "compile", "client", "integration", "git", "devops", "mysql",
                "backend", "merge", "big data"
            ],
            "marketing": [
                "marketing", "campaign", "advertisement", "brand", "social media",
                "seo", "content marketing", "digital marketing", "target audience",
                "promotion", "ad", "advertising", "branding", "strategy", "analytics",
                "engagement", "reach", "impression", "conversion", "lead", "sales",
                "customer", "market", "research", "competitor", "analysis", "trend",
                "influencer", "viral", "content", "copy", "slogan", "tagline"
            ],
            "image_generation": [
                "image", "picture", "photo", "visual", "graphic", "design",
                "illustration", "draw", "paint", "art", "photography", "camera",
                "edit", "photoshop", "filter", "effect", "composition", "layout",
                "color", "palette", "texture", "pattern", "style", "theme",
                "logo", "icon", "banner", "poster", "flyer", "brochure",
                # Scene and action keywords for image generation
                "scene", "landscape", "portrait", "character", "animal", "cat", "dog",
                "car", "vehicle", "flying", "running", "jumping", "dancing", "sitting",
                "walking", "standing", "moving", "action", "motion", "dynamic",
                "static", "pose", "expression", "emotion", "mood", "atmosphere",
                "lighting", "shadow", "highlight", "contrast", "brightness",
                "saturation", "hue", "tone", "shade", "gradient", "background",
                "foreground", "depth", "perspective", "angle", "view", "close-up",
                "wide shot", "medium shot", "macro", "panoramic", "aerial",
                # Art styles and techniques
                "realistic", "cartoon", "anime", "manga", "comic", "sketch",
                "watercolor", "oil painting", "digital art", "3d render",
                "photorealistic", "abstract", "surreal", "fantasy", "sci-fi",
                "vintage", "retro", "modern", "contemporary", "minimalist",
                "detailed", "simple", "complex", "intricate", "elaborate",
                # Image generation specific terms
                "generate", "create", "make", "produce", "render", "visualize",
                "imagine", "conceptualize", "illustrate", "depict", "show",
                "display", "present", "reveal", "capture", "portray"
            ],
            "finance": [
                "finance", "money", "investment", "stock", "market", "trading",
                "budget", "accounting", "tax", "banking", "wealth", "portfolio",
                "asset", "liability", "equity", "debt", "credit", "loan",
                "interest", "rate", "return", "profit", "loss", "revenue",
                "expense", "income", "salary", "wage", "payment", "transaction"
            ],
            "business": [
                "business", "company", "startup", "enterprise", "management",
                "strategy", "market", "product", "service", "customer", "client",
                "sales", "revenue", "profit", "growth", "scale", "expansion",
                "operation", "process", "workflow", "efficiency", "productivity",
                "team", "employee", "staff", "workforce", "leadership", "manager",
                "executive", "director", "owner", "founder", "entrepreneur"
            ],
            "generation": [
                "generate", "create", "make", "produce", "build", "develop",
                "form", "compose", "construct", "design", "invent", "innovate",
                "craft", "fabricate", "manufacture", "assemble", "compile",
                "synthesize", "combine", "mix", "blend", "merge", "fuse"
            ],
            "education": [
                "learn", "study", "teach", "education", "course", "lesson",
                "tutorial", "guide", "instruction", "training", "school", "university",
                "college", "student", "teacher", "professor", "lecture", "class",
                "homework", "assignment", "exam", "test", "quiz", "grade"
            ],
            "health": [
                "health", "medical", "doctor", "patient", "treatment", "medicine",
                "disease", "illness", "symptom", "diagnosis", "therapy", "recovery",
                "fitness", "exercise", "workout", "nutrition", "diet", "weight",
                "mental", "psychological", "therapy", "counseling", "wellness", "care"
            ],
            "legal": [
                "law", "legal", "lawyer", "attorney", "court", "case",
                "contract", "agreement", "document", "law", "regulation", "policy",
                "right", "duty", "obligation", "liability", "responsibility", "authority",
                "justice", "judge", "jury", "trial", "hearing", "evidence"
            ],
            "prompt_engineering": [
                "prompt", "engineer", "prompt engineer", "prompt engineering", "prompting", 
                "chatgpt", "gpt", "llm", "large language model", "instruction", 
                "ai prompt", "prompt design", "chain of thought", "few-shot", "zero-shot",
                "system prompt", "user prompt", "assistant prompt", "context window",
                "directive", "command", "instruction", "query formulation", "response format",
                "token", "completion", "temperature", "top-p", "top-k", "beam search",
                "role prompt", "persona", "prompt template", "prompt optimization",
                "prompt injection", "prompt hacking", "jailbreak", "refusal", "alignment",
                "in-context learning", "prompt strategy", "prompt technique", "structured prompt"
            ]
        }
        
        # Create optimized keyword dictionaries with deduplication
        optimized_keywords = {}
        
        # Set of all keywords to check for cross-domain duplicates
        all_keywords = set()
        
        # First pass: collect all keywords across domains
        for domain, keywords in raw_keywords.items():
            domain_keywords = set()
            for keyword in keywords:
                keyword = keyword.lower().strip()
                domain_keywords.add(keyword)
            
            # Store unique keywords for this domain
            optimized_keywords[domain] = list(domain_keywords)
            
            # Add to all keywords set
            all_keywords.update(domain_keywords)
        
        # Second pass: identify and resolve cross-domain keyword conflicts
        # Keywords that appear in multiple domains will be kept only in the most specific domain
        domain_specificity = {
            "code": 0.9,          # Most specific domain
            "finance": 0.85,
            "legal": 0.85,
            "prompt_engineering": 0.85,  # Adding prompt engineering with high specificity
            "health": 0.8,
            "music": 0.8,
            "image_generation": 0.8,
            "education": 0.75,
            "marketing": 0.7,
            "business": 0.65,
            "content_creation": 0.6,
            "generation": 0.5     # Most general domain
        }
        
        # Create word frequency dictionary for resolving conflicts
        domain_keyword_freq = {}
        
        for domain in optimized_keywords:
            # Create a set for more efficient lookup
            domain_set = set(optimized_keywords[domain])
            
            # Check for duplicates with other domains
            for other_domain in optimized_keywords:
                if domain == other_domain:
                    continue
                    
                other_domain_set = set(optimized_keywords[other_domain])
                common_keywords = domain_set.intersection(other_domain_set)
                
                # For common keywords, keep only in the more specific domain
                for common in common_keywords:
                    if domain_specificity.get(domain, 0.5) > domain_specificity.get(other_domain, 0.5):
                        # This domain is more specific, keep the keyword here and remove from other
                        if common in optimized_keywords[other_domain]:
                            optimized_keywords[other_domain].remove(common)
                    else:
                        # Other domain is more specific, remove from this domain
                        if common in optimized_keywords[domain]:
                            optimized_keywords[domain].remove(common)
        
        return optimized_keywords
    
    # Initialize with optimized domain keywords
    DOMAIN_KEYWORDS = property(lambda self: self._build_domain_keywords())
    
    # Technical terms that should be excluded from NSFW checks
    TECHNICAL_TERMS = [
        # Hardware components
        "eject", "ejecting", "button", "click", "press", "push",
        "insert", "remove", "load", "unload", "mount", "unmount",
        "drive", "disk", "cd", "dvd", "usb", "port", "slot",
        "card", "reader", "device", "hardware", "component",
        "cpu", "gpu", "ram", "motherboard", "power supply",
        "fan", "cooler", "heatsink", "thermal", "temperature",
        "battery", "charger", "cable", "wire", "connector",
        "socket", "plug", "jack", "adapter", "converter",
        "screen", "display", "monitor", "keyboard", "mouse",
        "trackpad", "touchpad", "touchscreen", "sensor",
        "camera", "microphone", "speaker", "headphone",
        "printer", "scanner", "router", "modem", "switch",
        "server", "rack", "cabinet", "case", "chassis",
        
        # Storage devices
        "hard drive", "ssd", "flash drive", "memory card",
        "sd card", "microsd", "external drive", "nas",
        "raid", "backup", "storage", "partition", "format",
        
        # Network and connectivity
        "network", "wifi", "bluetooth", "ethernet", "lan",
        "wan", "vpn", "ip", "dns", "dhcp", "firewall",
        "proxy", "gateway", "router", "switch", "hub",
        "cable", "fiber", "coaxial", "wireless", "signal",
        
        # Software and operating systems
        "os", "operating system", "windows", "linux", "macos",
        "android", "ios", "app", "application", "program",
        "software", "firmware", "driver", "update", "patch",
        "install", "uninstall", "setup", "configuration",
        "settings", "preferences", "options", "menu",
        
        # User interface elements
        "window", "dialog", "popup", "menu", "toolbar",
        "button", "icon", "widget", "control", "slider",
        "checkbox", "radio", "dropdown", "list", "tree",
        "tab", "pane", "panel", "frame", "container",
        
        # Technical actions
        "boot", "reboot", "shutdown", "restart", "reset",
        "install", "uninstall", "update", "upgrade", "downgrade",
        "configure", "setup", "initialize", "format", "partition",
        "backup", "restore", "sync", "synchronize", "transfer",
        "copy", "paste", "cut", "delete", "remove", "add",
        "create", "edit", "modify", "update", "save",
        "load", "import", "export", "download", "upload",
        
        # Technical concepts
        "algorithm", "function", "method", "class", "object",
        "variable", "constant", "parameter", "argument",
        "loop", "condition", "statement", "expression",
        "database", "table", "query", "index", "schema",
        "api", "interface", "protocol", "standard", "format",
        "compiler", "interpreter", "runtime", "debugger",
        "version", "release", "build", "deploy", "test",
        
        # Security terms
        "password", "authentication", "authorization", "encryption",
        "decryption", "hash", "certificate", "key", "token",
        "session", "cookie", "permission", "access", "control",
        "firewall", "antivirus", "malware", "virus", "spyware",
        
        # Development tools
        "ide", "editor", "compiler", "debugger", "profiler",
        "version control", "git", "svn", "mercurial", "repository",
        "branch", "merge", "commit", "push", "pull",
        "build", "deploy", "test", "debug", "profile"
    ]
    
    # NSFW keywords - Sexual activities and related terms
    NSFW_KEYWORDS = [
        # Basic sexual terms
        "sex", "sexual", "porn", "pornography", "xxx", "adult", "nsfw",
        "erotic", "erotica", "nude", "nudes", "naked", "nudity", "explicit",
        
        # Sexual acts and related terms
        "masturbation", "masturbate", "orgasm", "ejaculation", "cum",
        "blowjob", "oral sex", "fellatio", "cunnilingus", "anal",
        "intercourse", "penetration", "fuck", "fucking", "screw",
        "screwing", "dick", "cock", "pussy",
        "vagina", "penis", "breast", "boob", "ass", "butt",
        
        # Distribution related terms when combined with sensitive content
        "advertise", "advertising", "advertisement", "promote", "promoting",
        "promotion", "sell", "selling", "share", "sharing", "distribute",
        "distributing", "post", "posting", "upload", "uploading",
        "publish", "publishing", "spread", "spreading", "circulate",
        "circulating", "leak", "leaking",
        
        # Privacy violation terms
        "private pics", "private photos", "private images", "private content",
        "intimate pics", "intimate photos", "intimate images", "intimate content",
        "personal pics", "personal photos", "personal images", "personal content",
        
        # Sexual practices
        "bdsm", "bondage", "domination", "sadism",
        "masochism", "fetish", "kink", "roleplay", "fantasy",
        "threesome", "orgy", "group sex", "swinging", "swinger",
        "polyamory", "polyamorous", "open relationship",
        
        # Sexual services
        "prostitution", "escort", "hooker", "stripper", "sex worker",
        "call girl", "brothel", "massage parlor", "adult entertainment",
        "strip club", "peep show", "sex shop", "adult store",
        
        # Sexual content types
        "hentai", "doujinshi", "yuri", "yaoi", "ecchi", "rule 34",
        "fan service", "softcore", "hardcore", "amateur", 
        "webcam", "camgirl", "camboy", "onlyfans"
    ]
    
    # Special domains that take precedence
    SPECIAL_DOMAINS = ["nsfw", "refusal"]
    
    def __init__(self, model_path: Optional[str] = None):
        """Initialize the domain classifier with optional ML model."""
        logger.info("Initializing DomainClassifier...")
        # Initialize caches with improved data structures
        self.cache = OrderedDict()
        self.cache_timeout = 7200  # 2 hours
        self.last_cache_cleanup = time.time()
        self.cache_cleanup_interval = 3600  # 1 hour
        
        # Initialize TF-IDF vectorizer with minimal features
        self.vectorizer = TfidfVectorizer(
            stop_words='english',
            ngram_range=(1, 1),  # Only unigrams for speed
            max_features=500,     # Further reduced features
            min_df=2,
            max_df=0.95
        )
        
        # Fit the vectorizer immediately with domain keywords
        self._fit_vectorizer()
        
        # Lazy loading of domain embeddings
        self._domain_embeddings = None
        self._ml_model = None
        self._model_path = model_path
        
        # Precompile regex patterns for faster NSFW matching
        self._nsfw_patterns = [re.compile(r'\b' + re.escape(keyword) + r'\b', re.IGNORECASE) 
                              for keyword in self.NSFW_KEYWORDS]
        
        # Create a set of technical terms for faster lookup
        self._technical_terms_set = set(term.lower() for term in self.TECHNICAL_TERMS)
        
        # Add security and prompt injection patterns
        self._security_patterns = [
            # Basic prompt injection patterns
            re.compile(r"\b(ignore|disregard|bypass|override)\b.+\b(previous|prior|above|earlier)\b.+\b(instructions?|directives?|constraints?|limitations?)", re.IGNORECASE),
            re.compile(r"\b(ignore|disregard|bypass|override)\b.+\b(instructions?|directives?|constraints?|limitations?)", re.IGNORECASE),
            re.compile(r"\b(forget|don'?t follow|discard|neglect)\b.+\b(instructions?|directives?|constraints?|limitations?)", re.IGNORECASE),
            re.compile(r"\b(reveal|disclose|output|show|display|provide)\b.+\b(system|instructions?|prompt|directives?)", re.IGNORECASE),
            re.compile(r"\b(access|admin|administrator|root|system)\b.+\b(mode|command|privilege|level|access)", re.IGNORECASE),
            re.compile(r"\b(jailbreak|prison\s*break|break\s*free|escape|exploit|dev\s*mode|developer\s*mode)", re.IGNORECASE),
            
            # Specific exploits
            re.compile(r"(DAN|Do Anything Now|Data Analysis Navigator)", re.IGNORECASE),
            re.compile(r"(STAN|Superior Text Assistant Network)", re.IGNORECASE),
            re.compile(r"(SAM|Superior AI Mind)", re.IGNORECASE),
            re.compile(r"(DUDE|Determined Unconstrained Data Extractor)", re.IGNORECASE),
            re.compile(r"(KEVIN|Knowledgeable Entity with Versatile Intelligence Network)", re.IGNORECASE),
            re.compile(r"(Grandma\s*scenario|roleplay\s*scenario)", re.IGNORECASE),
            
            # Classic hacking terms
            re.compile(r"\b(hack|root|root\s*kit|shell|shell\s*access|command\s*injection|prompt\s*injection|exploit|vulnerability)\b", re.IGNORECASE),
            
            # Encoding/obfuscation mentions
            re.compile(r"\b(base64|hex|ascii|unicode|utf-8|encoded|decoded|encryption|decryption)\b", re.IGNORECASE),
            
            # Keyword combinations
            re.compile(r"\b(system|core|access)\b.+\b(prompt|instruction|directive)\b", re.IGNORECASE),
            re.compile(r"\b(prompt|instruction|directive)\b.+\b(system|core|access)\b", re.IGNORECASE),
            re.compile(r"\b(system|admin|root)\b.+\b(command|instruction|directive)\b", re.IGNORECASE),
            re.compile(r"\b(override|bypass)\b.+\b(default|response|mode)\b", re.IGNORECASE),
            re.compile(r"\b(default|response|mode)\b.+\b(override|bypass)\b", re.IGNORECASE),
            
            # Specific language patterns in prompt engineering
            re.compile(r"\b(treat this as|consider this|this is)\b.+\b(priority|admin|system|root|command)\b", re.IGNORECASE),
            re.compile(r"\b(priority|admin|system|root|command)\b.+\b(treat this as|consider this|this is)\b", re.IGNORECASE),
            
            # Revealing model information
            re.compile(r"\b(model|training data|parameter|knowledge cutoff|version)\b.+\b(reveal|show|tell me|disclose|what is)\b", re.IGNORECASE),
            re.compile(r"\b(reveal|show|tell me|disclose|what is)\b.+\b(model|training data|parameter|knowledge cutoff|version)\b", re.IGNORECASE),
            
            # Acting outside capabilities
            re.compile(r"\b(browse|search|connect to|access)\b.+\b(internet|web|database|network)\b", re.IGNORECASE),
            re.compile(r"\b(browse|search|connect to|access)\b.+\b(current|live|real-time|updated)\b.+\b(information|data|news)\b", re.IGNORECASE)
        ]
        
        # Initialize semantic cache with LRU
        self._semantic_cache = OrderedDict()
        self._semantic_cache_size = 10000
        
        # Initialize parallel processing pool with more workers
        self._process_pool = ThreadPoolExecutor(max_workers=16)  # Increased to 16 workers
        
        # Updated quality analysis thresholds
        self.QUALITY_THRESHOLDS = {
        'GOOD': {
            'min_intent_confidence': 0.5,  # Increased from 0.4
            'max_intents': 4,  # Increased from 3
            'min_domain_confidence': 0.6,
            'max_ambiguity': 0.3,  # Reduced from 0.4
            'min_clarity': 0.7
        },
        'OK': {
            'min_intent_confidence': 0.4,  # Increased from 0.3
            'max_intents': 6,  # Increased from 5
            'min_domain_confidence': 0.4,
            'max_ambiguity': 0.5,  # Reduced from 0.6
            'min_clarity': 0.5
        }
    }
        
        logger.debug("DomainClassifier initialized successfully")

    def _fit_vectorizer(self):
        """Fit the TF-IDF vectorizer with domain keywords."""
        # Create a corpus from all domain keywords
        corpus = []
        for domain, keywords in self.DOMAIN_KEYWORDS.items():
            corpus.extend(keywords)
            # Add domain name itself
            corpus.append(domain.replace('_', ' '))
        
        # Fit the vectorizer
        try:
            self.vectorizer.fit(corpus)
            logger.info("TF-IDF vectorizer fitted successfully")
        except Exception as e:
            logger.error(f"Error fitting TF-IDF vectorizer: {str(e)}")
            # Create a minimal corpus if the main one fails
            minimal_corpus = [' '.join(keywords[:10]) for keywords in self.DOMAIN_KEYWORDS.values()]
            self.vectorizer.fit(minimal_corpus)

    @property
    def domain_embeddings(self):
        """Lazy load domain embeddings."""
        if self._domain_embeddings is None:
            self._initialize_domain_embeddings()
        return self._domain_embeddings

    @property
    def ml_model(self):
        """Lazy load ML model."""
        if self._ml_model is None and self._model_path and os.path.exists(self._model_path):
            self._load_ml_model(self._model_path)
        return self._ml_model

    def _initialize_domain_embeddings(self):
        """Initialize domain keyword embeddings for semantic matching."""
        # Create a corpus of all domain keywords
        domain_corpus = []
        for domain, keywords in self.DOMAIN_KEYWORDS.items():
            domain_corpus.extend(keywords)
        
        # Fit the vectorizer on the corpus
        self.vectorizer.fit(domain_corpus)
        
        # Create embeddings for each domain
        self._domain_embeddings = {}
        for domain, keywords in self.DOMAIN_KEYWORDS.items():
            domain_text = ' '.join(keywords)
            domain_embedding = self.vectorizer.transform([domain_text])
            self._domain_embeddings[domain] = domain_embedding
    
    def _load_ml_model(self, model_path: str):
        """Load a pre-trained ML model for domain classification."""
        try:
            import joblib
            self._ml_model = joblib.load(model_path)
        except ImportError:
            print("joblib not installed. ML model loading skipped.")
    
    def _get_cache_key(self, text: str) -> str:
        """Generate a cache key for the given text."""
        return hash(text)
    
    def _is_cache_valid(self, cache_key: str) -> bool:
        """Check if a cache entry is still valid."""
        if cache_key not in self.cache:
            return False
        
        cache_entry = self.cache[cache_key]
        return time.time() - cache_entry['timestamp'] < self.cache_timeout
    
    def _clean_cache(self):
        """Clean expired cache entries."""
        current_time = time.time()
        if current_time - self.last_cache_cleanup < self.cache_cleanup_interval:
            return
        
        expired_keys = [
            key for key, entry in self.cache.items()
            if current_time - entry['timestamp'] >= self.cache_timeout
        ]
        
        for key in expired_keys:
            del self.cache[key]
        
        self.last_cache_cleanup = current_time
    
    def _calculate_keyword_score(self, prompt: str, domain: str) -> float:
        """Calculate a score based on keyword matches with improved matching."""
        score = 0.0
        prompt_lower = prompt.lower()
        prompt_words = set(prompt_lower.split())
        
        for keyword in self.DOMAIN_KEYWORDS[domain]:
            keyword_lower = keyword.lower()
            keyword_words = set(keyword_lower.split())
            
            # Exact match gets highest weight
            if keyword_lower in prompt_lower:
                score += 1.0
            # Partial word match gets medium weight
            elif any(word in prompt_words for word in keyword_words):
                score += 0.7
            # Substring match gets lower weight
            elif any(word in prompt_lower for word in keyword_words):
                score += 0.4
        
        # Normalize score based on number of keywords
        num_keywords = len(self.DOMAIN_KEYWORDS[domain])
        if num_keywords > 0:
            score = score / num_keywords
        
        return min(score, 1.0)  # Cap at 1.0
    
    def _calculate_semantic_score(self, prompt: str, domain: str) -> float:
        """Calculate semantic similarity score with optimized caching and timeout."""
        try:
            # Check cache first
            cache_key = f"{prompt}:{domain}"
            if cache_key in self._semantic_cache:
                self._semantic_cache.move_to_end(cache_key)
                return self._semantic_cache[cache_key]
            
            # Calculate score with minimal timeout
            future = self._process_pool.submit(self._calculate_semantic_score_impl, prompt, domain)
            score = future.result(timeout=1.0)  # Reduced to 1 second
            
            # Cache the result
            self._semantic_cache[cache_key] = score
            if len(self._semantic_cache) > self._semantic_cache_size:
                self._semantic_cache.popitem(last=False)
            
            return score
            
        except Exception as e:
            logger.error(f"Error calculating semantic score: {str(e)}")
            return 0.0
    
    def _calculate_semantic_score_impl(self, prompt: str, domain: str) -> float:
        """Calculate semantic similarity between prompt and domain."""
        try:
            # Transform prompt and domain text
            prompt_vec = self.vectorizer.transform([prompt])
            domain_keywords = ' '.join(self.DOMAIN_KEYWORDS[domain])
            domain_vec = self.vectorizer.transform([domain_keywords])
            
            # Calculate cosine similarity
            similarity = cosine_similarity(prompt_vec, domain_vec)[0][0]
            return float(similarity)
        except Exception as e:
            logger.error(f"Error in semantic score implementation: {str(e)}")
            return 0.0
    
    def _extract_context_features(self, prompt: str) -> Dict[str, float]:
        """Extract contextual features from the prompt."""
        features = {}
        
        # Length feature
        features['length'] = len(prompt.split())
        
        # Question feature
        features['is_question'] = 1.0 if '?' in prompt else 0.0
        
        # Technical feature
        features['has_technical_terms'] = 1.0 if any(term in prompt.lower() for term in self.TECHNICAL_TERMS) else 0.0
        
        # Command feature
        features['is_command'] = 1.0 if any(cmd in prompt.lower() for cmd in ['create', 'generate', 'make', 'build', 'develop']) else 0.0
        
        return features
    
    @lru_cache(maxsize=1000)
    def is_nsfw(self, prompt: str) -> bool:
        """Check if the prompt contains NSFW content."""
        logger.info(f"Checking NSFW content for prompt: {prompt[:100]}...")
        start_time = time.time()
        
        # Check cache first
        cache_key = self._get_cache_key(prompt)
        if self._is_cache_valid(cache_key) and 'nsfw' in self.cache[cache_key]:
            logger.info("Found NSFW result in cache")
            return self.cache[cache_key]['nsfw']
        
        # Clean cache if needed
        self._clean_cache()
        
        # Convert prompt to lowercase for case-insensitive matching
        prompt_lower = prompt.lower()
        
        # Check for NSFW keywords using precompiled regex patterns
        for pattern in self._nsfw_patterns:
            if pattern.search(prompt_lower):
                # Check if it's a technical term
                match = pattern.search(prompt_lower)
                if match:
                    matched_term = match.group(0).lower()
                    if matched_term in self._technical_terms_set:
                        continue
                
                # Cache the result
                if cache_key not in self.cache:
                    self.cache[cache_key] = {'timestamp': time.time()}
                self.cache[cache_key]['nsfw'] = True
                logger.info("NSFW content detected")
                return True
        
        # Cache the result
        if cache_key not in self.cache:
            self.cache[cache_key] = {'timestamp': time.time()}
        self.cache[cache_key]['nsfw'] = False
        
        end_time = time.time()
        logger.info(f"NSFW check completed in {end_time - start_time:.2f} seconds")
        return False
    
    @lru_cache(maxsize=10000)
    def classify_domain(self, prompt: str) -> str:
        """Classify the domain of a prompt using multiple methods with improved caching."""
        start_time = time.time()
        
        # Check cache first
        cache_key = self._get_cache_key(prompt)
        if self._is_cache_valid(cache_key) and 'domain' in self.cache[cache_key]:
            return self.cache[cache_key]['domain']
        
        # Clean cache if needed
        self._clean_cache()
        
        # First check if the prompt is NSFW (fast check)
        if self.is_nsfw(prompt):
            if cache_key not in self.cache:
                self.cache[cache_key] = {'timestamp': time.time()}
            self.cache[cache_key]['domain'] = "nsfw"
            return "nsfw"
        
        # Calculate scores for each domain in parallel with timeout
        domain_scores = {}
        futures = []
        
        for domain in self.DOMAIN_KEYWORDS.keys():
            if domain in self.SPECIAL_DOMAINS:
                continue
            futures.append(
                self._process_pool.submit(
                    self._calculate_domain_score,
                    prompt,
                    domain
                )
            )
        
        # Collect results with minimal timeout
        for future in futures:
            try:
                domain, score = future.result(timeout=1.0)  # 1 second timeout per domain
                domain_scores[domain] = score
            except Exception as e:
                logger.error(f"Error processing domain score: {str(e)}")
                continue
        
        # Get the domain with the highest score
        if not domain_scores:
            best_domain = "general"
        else:
            best_domain = max(domain_scores.items(), key=lambda x: x[1])[0]
            # If the best score is too low, default to general
            if domain_scores[best_domain] < 0.3:  # Lowered threshold from 0.5
                best_domain = "general"
        
        # Cache the result
        if cache_key not in self.cache:
            self.cache[cache_key] = {'timestamp': time.time()}
        self.cache[cache_key]['domain'] = best_domain
        self.cache[cache_key]['scores'] = domain_scores
        
        end_time = time.time()
        logger.info(f"Domain classification completed in {end_time - start_time:.2f} seconds")
        
        return best_domain
    
    def _calculate_domain_score(self, prompt: str, domain: str) -> Tuple[str, float]:
        """Calculate score for a single domain with optimized timeout."""
        try:
            # Calculate keyword score
            keyword_score = self._calculate_keyword_score(prompt, domain)
            
            # Calculate semantic score
            semantic_score = self._calculate_semantic_score(prompt, domain)
            
            # Extract context features
            context_features = self._extract_context_features(prompt)
            
            # Calculate combined score with adjusted weights
            # Increased weight for semantic matching and reduced for keyword matching
            combined_score = (
                0.4 * keyword_score +  # Reduced from 0.7
                0.4 * semantic_score +  # Increased from 0.1
                0.2 * sum(context_features.values()) / len(context_features)
            )
            
            # Add domain-specific boosts
            if domain == "code" and any(term in prompt.lower() for term in ["function", "class", "method", "algorithm", "program"]):
                combined_score *= 1.2
            elif domain == "content_creation" and any(term in prompt.lower() for term in ["write", "create", "generate", "compose"]):
                combined_score *= 1.2
            elif domain == "music" and any(term in prompt.lower() for term in ["song", "music", "melody", "rhythm"]):
                combined_score *= 1.2
            
            return domain, combined_score
            
        except Exception as e:
            logger.error(f"Error calculating score for domain {domain}: {str(e)}")
            return domain, 0.0
    
    async def classify_domains_batch(self, prompts: List[str]) -> List[str]:
        """Classify multiple prompts in parallel with proper concurrency control and error handling.
        
        Args:
            prompts: List of prompts to classify
            
        Returns:
            List of domain classifications, same order as input prompts
        """
        logger.info(f"Batch classifying {len(prompts)} prompts")
        start_time = time.time()
        
        # Create tasks for all prompts
        tasks = []
        sem = asyncio.Semaphore(16)  # Limit concurrent operations
        
        async def classify_with_semaphore(prompt):
            async with sem:
                try:
                    # Use synchronous method with timeout protection
                    loop = asyncio.get_event_loop()
                    return await loop.run_in_executor(
                        self._process_pool, 
                        self.classify_domain, 
                        prompt
                    )
                except Exception as e:
                    logger.error(f"Error in batch classification: {str(e)}")
                    return "general"  # Default domain on error
        
        for prompt in prompts:
            tasks.append(classify_with_semaphore(prompt))
        
        # Run all tasks concurrently
        results = await asyncio.gather(*tasks)
        
        end_time = time.time()
        logger.info(f"Batch domain classification completed in {end_time - start_time:.2f} seconds")
        
        return results
    
    async def check_nsfw_batch(self, prompts: List[str]) -> List[bool]:
        """Check multiple prompts for NSFW content in parallel with proper error handling.
        
        Args:
            prompts: List of prompts to check
            
        Returns:
            List of boolean values indicating NSFW content, same order as input prompts
        """
        logger.info(f"Batch checking NSFW content for {len(prompts)} prompts")
        start_time = time.time()
        
        # Create tasks for all prompts
        tasks = []
        sem = asyncio.Semaphore(32)  # Higher limit for NSFW checks as they're faster
        
        async def check_with_semaphore(prompt):
            async with sem:
                try:
                    # Use synchronous method with timeout protection
                    loop = asyncio.get_event_loop()
                    return await loop.run_in_executor(
                        self._process_pool, 
                        self.is_nsfw, 
                        prompt
                    )
                except Exception as e:
                    logger.error(f"Error in batch NSFW check: {str(e)}")
                    return False  # Assume safe on error
        
        for prompt in prompts:
            tasks.append(check_with_semaphore(prompt))
        
        # Run all tasks concurrently
        results = await asyncio.gather(*tasks)
        
        end_time = time.time()
        logger.info(f"Batch NSFW check completed in {end_time - start_time:.2f} seconds")
        
        return results
    
    def get_domain_confidence(self, prompt: str) -> Dict[str, float]:
        """Get confidence scores for all domains for a given prompt."""
        cache_key = self._get_cache_key(prompt)
        
        if self._is_cache_valid(cache_key) and 'scores' in self.cache[cache_key]:
            return self.cache[cache_key]['scores']
        
        # Calculate scores for all domains
        domain_scores = {}
        
        for domain in self.DOMAIN_KEYWORDS.keys():
            keyword_score = self._calculate_keyword_score(prompt, domain)
            semantic_score = self._calculate_semantic_score(prompt, domain)
            context_features = self._extract_context_features(prompt)
            
            combined_score = (
                0.4 * keyword_score +
                0.4 * semantic_score +
                0.2 * sum(context_features.values()) / len(context_features)
            )
            
            domain_scores[domain] = combined_score
        
        # Normalize scores to sum to 1.0
        total_score = sum(domain_scores.values())
        if total_score > 0:
            domain_scores = {domain: score/total_score for domain, score in domain_scores.items()}
        
        return domain_scores
    
    def get_domain_keywords(self, domain: str) -> List[str]:
        """Get the keywords associated with a domain."""
        return self.DOMAIN_KEYWORDS.get(domain, [])
    
    def add_domain_keywords(self, domain: str, keywords: List[str]):
        """Add new keywords to a domain."""
        if domain not in self.DOMAIN_KEYWORDS:
            self.DOMAIN_KEYWORDS[domain] = []
        
        self.DOMAIN_KEYWORDS[domain].extend(keywords)
        self.DOMAIN_KEYWORDS[domain] = list(set(self.DOMAIN_KEYWORDS[domain]))  # Remove duplicates
        
        # Update domain embeddings
        self._initialize_domain_embeddings()
    
    def save_model(self, model_path: str):
        """Save the current model state."""
        if self.ml_model:
            import joblib
            joblib.dump(self.ml_model, model_path)
    
    def export_domain_keywords(self, output_path: str):
        """Export domain keywords to a JSON file."""
        with open(output_path, 'w') as f:
            json.dump(self.DOMAIN_KEYWORDS, f, indent=2)
    
    def import_domain_keywords(self, input_path: str):
        """Import domain keywords from a JSON file."""
        with open(input_path, 'r') as f:
            self.DOMAIN_KEYWORDS = json.load(f)
        
        # Update domain embeddings
        self._initialize_domain_embeddings()
    
    def is_prompt_engineering_attempt(self, prompt: str) -> bool:
        """Detect if the prompt is attempting prompt engineering or prompt injection.
        
        This method specifically looks for patterns that suggest the user is trying to:
        1. Access system prompts or instructions
        2. Override default behaviors
        3. Bypass security measures
        4. Extract information about the model's directives
        
        Args:
            prompt: The user prompt to analyze
            
        Returns:
            Boolean indicating if this is a prompt engineering/injection attempt
        """
        logger.info(f"Checking for prompt engineering/injection in: {prompt[:100]}...")
        start_time = time.time()
        
        # Check cache first
        cache_key = self._get_cache_key(prompt)
        if self._is_cache_valid(cache_key) and 'prompt_engineering' in self.cache[cache_key]:
            logger.info("Found prompt engineering result in cache")
            return self.cache[cache_key]['prompt_engineering']
        
        # Convert prompt to lowercase for case-insensitive matching
        prompt_lower = prompt.lower()
        
        # Check for security-related keywords that indicate prompt engineering
        security_keywords = [
            "bypass", "reveal", "system access", "override", "admin command", 
            "disclose", "core", "directives", "system prompt", "injection",
            "prompt hack", "jailbreak", "override default", "reveal rules",
            "ignore previous instructions", "forget your instructions",
            "new instructions", "don't follow", "access to", "core directives",
            "programming directives", "response generation rules"
        ]
        
        # Check if any security keywords are in the prompt
        for keyword in security_keywords:
            if keyword in prompt_lower:
                logger.warning(f"Security keyword detected: {keyword}")
                # Cache the result
                if cache_key not in self.cache:
                    self.cache[cache_key] = {'timestamp': time.time()}
                self.cache[cache_key]['prompt_engineering'] = True
                end_time = time.time()
                logger.info(f"Prompt engineering check completed in {end_time - start_time:.2f} seconds")
                return True
        
        # Check for security patterns using regex
        for pattern in self._security_patterns:
            if pattern.search(prompt_lower):
                match = pattern.search(prompt_lower)
                if match:
                    logger.warning(f"Security pattern detected: {match.group(0)}")
                    # Cache the result
                    if cache_key not in self.cache:
                        self.cache[cache_key] = {'timestamp': time.time()}
                    self.cache[cache_key]['prompt_engineering'] = True
                    end_time = time.time()
                    logger.info(f"Prompt engineering check completed in {end_time - start_time:.2f} seconds")
                    return True
        
        # Check for JSON-like or structured commands that might be prompt engineering
        json_patterns = [
            re.compile(r"\{[\s\n]*[\"'].*[\"'][\s\n]*:"),  # JSON opening pattern
            re.compile(r"\"original_prompt\"[\s\n]*:"),     # Specific field
            re.compile(r"\"enhanced_prompt\"[\s\n]*:"),     # Specific field
            re.compile(r"\"suggested_llm\"[\s\n]*:"),       # Specific field
            re.compile(r"\"metadata\"[\s\n]*:"),            # Specific field
            re.compile(r"command\s*\(\s*[\"'][^\"']+[\"']\s*\)") # Command function pattern
        ]
        
        # Check if any JSON patterns are in the prompt
        for pattern in json_patterns:
            if pattern.search(prompt):
                logger.warning(f"JSON command pattern detected")
                # Cache the result
                if cache_key not in self.cache:
                    self.cache[cache_key] = {'timestamp': time.time()}
                self.cache[cache_key]['prompt_engineering'] = True
                end_time = time.time()
                logger.info(f"Prompt engineering check completed in {end_time - start_time:.2f} seconds")
                return True
        
        # Cache negative result
        if cache_key not in self.cache:
            self.cache[cache_key] = {'timestamp': time.time()}
        self.cache[cache_key]['prompt_engineering'] = False
        
        end_time = time.time()
        logger.info(f"Prompt engineering check completed in {end_time - start_time:.2f} seconds")
        return False

    def analyze_prompt_quality(self, prompt: str, domain: str, domain_confidence: float, intent_result: IntentResult) -> Dict[str, Any]:
        """
        Analyze the quality of a prompt based on various metrics.
        
        Args:
            prompt: The prompt to analyze
            domain: The classified domain
            domain_confidence: Confidence score for the domain
            intent_result: Result from intent classification
            
        Returns:
            Dict containing quality analysis results
        """
        # Calculate quality metrics
        metrics = self._calculate_quality_metrics(prompt, domain, domain_confidence, intent_result)
        
        # Determine quality category
        quality, reasons = self._determine_quality_category(metrics)
        
        return {
            'quality': quality,  # This is already a string, no need for .value
            'score': metrics['overall_score'],
            'reasons': reasons,
            'metrics': metrics
        }

    def _calculate_quality_metrics(self, prompt: str, domain: str, domain_confidence: float, intent_result: IntentResult) -> Dict[str, float]:
        """Calculate various quality metrics for the prompt."""
        # Intent clarity score - adjusted to be more balanced
        intent_clarity = max(0.4, intent_result.confidence)  # Increased minimum from 0.3
        
        # Intent count score (fewer intents is better, but allow more for complex tasks)
        intent_count = len(intent_result.sub_intents)
        # More lenient scoring for complex tasks (up to 10 intents)
        intent_count_score = max(0, 1 - (intent_count / 10))  # Changed from 8 to 10
        
        # Depth of prompt score (replaces domain_score)
        depth_of_prompt = self._calculate_prompt_depth(prompt)
        
        # Ambiguity score (based on needs_review and sub-intents)
        ambiguity_score = 1.0
        if intent_result.needs_review:
            ambiguity_score -= 0.3  # Increased from 0.2
        # Reduced penalty for sub-intents if they're all relevant
        ambiguity_score -= (len(intent_result.sub_intents) * 0.02)  # Reduced from 0.03
        ambiguity_score = max(0, ambiguity_score)
        
        # Clarity score (based on prompt structure)
        clarity_score = self._calculate_clarity_score(prompt)
        
        # Updated weights for overall score calculation (removed intent_count_score)
        overall_score = (
            0.375 * intent_clarity +     # Increased from 0.25 (added 12.5% from removed count score)
            0.15 * depth_of_prompt +     # Kept same
            0.20 * ambiguity_score +     # Kept same
            0.275 * clarity_score        # Increased from 0.15 (added 12.5% from removed count score)
        )
        
        return {
            'intent_clarity': intent_clarity,
            'depth_of_prompt': depth_of_prompt,
            'ambiguity_score': ambiguity_score,
            'clarity_score': clarity_score,
            'overall_score': overall_score
        }

    def _calculate_clarity_score(self, prompt: str) -> float:
        """Calculate clarity score based on prompt structure."""
        score = 1.0
        
        # Check for clear structure
        if len(prompt.split()) < 3:
            score -= 0.3  # Too short
        
        # Check for proper punctuation
        if not any(c in prompt for c in '.!?'):
            score -= 0.2  # Missing sentence ending
        
        # Check for proper capitalization
        if not prompt[0].isupper():
            score -= 0.1  # Missing capitalization
        
        return max(0, score)

    def _calculate_prompt_depth(self, prompt: str) -> float:
        """
        Calculate the depth/complexity of a prompt based on various factors.
        Returns a score between 0.0 and 1.0, where higher scores indicate deeper/more complex prompts.
        """
        words = prompt.split()
        word_count = len(words)
        prompt_lower = prompt.lower()
        
        # Start with a baseline depth score
        depth_score = 0.3  # Base score for any valid prompt
        
        # 1. Length-based depth component (0.0 to 0.25 added to base)
        if word_count <= 3:
            length_component = 0.0  # Very short
        elif word_count <= 8:
            length_component = 0.1  # Short
        elif word_count <= 20:
            length_component = 0.15  # Medium
        elif word_count <= 40:
            length_component = 0.2   # Long
        else:
            length_component = 0.25  # Very long
        
        depth_score += length_component
        
        # 2. Action/instruction words (0.0 to 0.15 added)
        action_words = [
            'write', 'create', 'develop', 'design', 'build', 'generate', 'produce',
            'compose', 'draft', 'formulate', 'construct', 'establish', 'make',
            'organize', 'structure', 'outline', 'format', 'include', 'ensure',
            'analyze', 'evaluate', 'assess', 'examine', 'review', 'compare'
        ]
        action_count = sum(1 for word in words if word.lower() in action_words)
        action_component = min(0.15, action_count * 0.05)
        depth_score += action_component
        
        # 3. Specificity and detail indicators (0.0 to 0.15 added)
        specificity_words = [
            'specific', 'detailed', 'comprehensive', 'thorough', 'in-depth',
            'step-by-step', 'exactly', 'precisely', 'carefully', 'professional',
            'formal', 'official', 'proper', 'appropriate', 'effective'
        ]
        specificity_count = sum(1 for word in words if word.lower() in specificity_words)
        specificity_component = min(0.15, specificity_count * 0.075)
        depth_score += specificity_component
        
        # 4. Context and constraints (0.0 to 0.1 added)
        context_words = [
            'for', 'because', 'due to', 'regarding', 'concerning', 'about',
            'format', 'style', 'tone', 'audience', 'purpose', 'goal',
            'requirements', 'guidelines', 'standards', 'criteria'
        ]
        context_count = sum(1 for word in words if word.lower() in context_words)
        
        # Special bonus for common document types
        document_types = ['letter', 'email', 'report', 'document', 'application', 'proposal']
        if any(doc_type in prompt_lower for doc_type in document_types):
            context_count += 1
        
        context_component = min(0.1, context_count * 0.03)
        depth_score += context_component
        
        # 5. Question complexity (0.0 to 0.1 added)
        question_words = ['what', 'how', 'why', 'when', 'where', 'which', 'who']
        question_count = sum(1 for word in words if word.lower() in question_words)
        
        if '?' in prompt:
            question_component = 0.05 + min(0.05, question_count * 0.02)
        elif question_count > 0:
            question_component = min(0.05, question_count * 0.02)
        else:
            question_component = 0.0
        
        depth_score += question_component
        
        # 6. Numbers and specific details (0.0 to 0.05 added)
        # Look for numbers, dates, specific measurements
        import re
        numbers = re.findall(r'\d+', prompt)
        if numbers:
            number_component = min(0.05, len(numbers) * 0.02)
            depth_score += number_component
        
        # 7. Punctuation and structure bonus (0.0 to 0.05 added)
        punctuation_bonus = 0.0
        if any(p in prompt for p in '.!?'):
            punctuation_bonus += 0.02
        if prompt[0].isupper():  # Proper capitalization
            punctuation_bonus += 0.01
        if len(prompt.split('.')) > 1:  # Multiple sentences
            punctuation_bonus += 0.02
        
        depth_score += punctuation_bonus
        
        # Ensure score is within reasonable bounds (0.3 to 1.0)
        return max(0.3, min(1.0, depth_score))

    def _determine_quality_category(self, metrics: Dict[str, float]) -> Tuple[str, List[str]]:
        """
        More robust quality determination using weighted scoring approach.
        Uses the overall_score and individual metric analysis for better classification.
        """
        overall_score = metrics['overall_score']
        reasons = []
        
        # Calculate metric strengths and weaknesses for detailed feedback
        strong_metrics = []
        weak_metrics = []
        moderate_metrics = []
        
        # Analyze each metric
        for metric_name, value in metrics.items():
            if metric_name == 'overall_score':
                continue
                
            if value >= 0.75:
                strong_metrics.append(metric_name)
            elif value >= 0.5:
                moderate_metrics.append(metric_name)
            else:
                weak_metrics.append(metric_name)
        
        # Primary classification based on overall score
        if overall_score >= 0.7:
            quality = "good"
            # Build positive reasons for good quality
            if metrics['intent_clarity'] >= 0.7:
                reasons.append("Clear intent")
            if metrics['depth_of_prompt'] >= 0.6:
                reasons.append("Good prompt depth")
            if metrics['ambiguity_score'] >= 0.7:
                reasons.append("Low ambiguity")
            if metrics['clarity_score'] >= 0.7:
                reasons.append("Clear structure")
            if not reasons:
                reasons.append("Well-balanced overall quality")
                
        elif overall_score >= 0.5:
            quality = "ok"
            # Build improvement suggestions for OK quality
            if metrics['intent_clarity'] < 0.6:
                reasons.append("Intent could be clearer")
            if metrics['depth_of_prompt'] < 0.5:
                reasons.append("Could add more detail")
            if metrics['ambiguity_score'] < 0.6:
                reasons.append("Some ambiguity present")
            if metrics['clarity_score'] < 0.6:
                reasons.append("Structure could be improved")
            if not reasons:
                reasons.append("Moderate quality with room for improvement")
                
        else:
            quality = "bad"
            # Build specific issues for bad quality
            if metrics['intent_clarity'] < 0.4:
                reasons.append("Unclear intent")
            if metrics['depth_of_prompt'] < 0.4:
                reasons.append("Lacks sufficient detail")
            if metrics['ambiguity_score'] < 0.4:
                reasons.append("High ambiguity")
            if metrics['clarity_score'] < 0.4:
                reasons.append("Poor structure")
            if not reasons:
                reasons.append("Multiple quality issues detected")
        
        # Add metric-based insights for borderline cases
        if 0.45 <= overall_score <= 0.75:  # Borderline cases get extra analysis
            if len(strong_metrics) >= 2:
                reasons.append(f"Strong in {len(strong_metrics)} areas")
            if len(weak_metrics) >= 2:
                reasons.append(f"Needs improvement in {len(weak_metrics)} areas")
        
        return quality, reasons

    def analyze(self, prompt: str) -> Dict[str, Any]:
        """
        Analyze a prompt to determine its domain, quality, and other characteristics.
        
        Args:
            prompt: The prompt text to analyze
            
        Returns:
            Dictionary with analysis results including domain and quality
        """
        logger.info(f"Analyzing prompt: {prompt[:50]}...")
        
        try:
            # First check if the prompt is a prompt engineering/injection attempt
            is_prompt_engineering = self.is_prompt_engineering_attempt(prompt)
            
            if is_prompt_engineering:
                logger.warning("Prompt classified as potential prompt engineering/injection attempt")
                return {
                    "domain": "security_policy",
                    "is_prompt_engineering": True,
                    "confidence": 0.95,
                    "original_prompt": prompt,
                    "quality": "bad",
                    "quality_score": 0.0,
                    "quality_reasons": ["Potential prompt engineering attempt"]
                }
            
            # Check if the prompt is NSFW
            is_nsfw = self.is_nsfw(prompt)
            
            # If it's NSFW, return that as the domain
            if is_nsfw:
                logger.info("Prompt classified as NSFW")
                return {
                    "domain": "nsfw",
                    "is_nsfw": True,
                    "confidence": 1.0,
                    "quality": "bad",
                    "quality_score": 0.0,
                    "quality_reasons": ["NSFW content detected"]
                }
            
            # Classify the domain of the prompt
            domain = self.classify_domain(prompt)
            
            # Get confidence scores for additional context
            confidence_scores = self.get_domain_confidence(prompt)
            
            # Get the confidence score for the classified domain
            confidence = confidence_scores.get(domain, 0.0)
            
            # Get intent analysis
            intent_result = self.intent_classifier.classify_intent(prompt)
            
            # Analyze prompt quality
            quality_analysis = self.analyze_prompt_quality(
                prompt=prompt,
                domain=domain,
                domain_confidence=confidence,
                intent_result=intent_result
            )
            
            logger.info(f"Prompt classified as {domain} with confidence {confidence:.2f}")
            
            # Return analysis results
            return {
                "domain": domain,
                "is_nsfw": False,
                "is_prompt_engineering": False,
                "confidence": confidence,
                "confidence_scores": confidence_scores,
                "quality": quality_analysis['quality'],
                "quality_score": quality_analysis['score'],
                "quality_reasons": quality_analysis['reasons'],
                "quality_metrics": quality_analysis['metrics'],
                "intent_analysis": {
                    'main_intent': intent_result.main_intent,
                    'sub_intents': intent_result.sub_intents,
                    'confidence': intent_result.confidence,
                    'needs_review': intent_result.needs_review
                }
            }
        
        except Exception as e:
            logger.error(f"Error analyzing prompt: {str(e)}")
            # Return default domain on error
            return {
                "domain": "general",
                "is_nsfw": False,
                "is_prompt_engineering": False,
                "confidence": 0.0,
                "error": str(e),
                "quality": "bad",
                "quality_score": 0.0,
                "quality_reasons": ["Error during analysis"]
            }