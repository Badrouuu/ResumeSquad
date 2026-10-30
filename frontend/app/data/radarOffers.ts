export interface RadarJobOffer {
  id: string;
  company: string;
  title: string;
  location: string;
  country: "Suisse" | "Luxembourg" | "Belgique" | "Allemagne" | "International";
  countryFlag: string;
  workplace: "Présentiel" | "Hybride";
  compensation?: string;
  skills: string[];
  url: string;
  description: string;
  postedAgo?: string;
  isFresh?: boolean;
}

export interface DeepSearchPortal {
  name: string;
  country: string;
  countryFlag: string;
  description: string;
  url: string;
  category: "Suisse" | "Luxembourg" | "Belgique" | "Allemagne" | "International";
}

export const DEEP_SEARCH_PORTALS: DeepSearchPortal[] = [
  {
    name: "LinkedIn Suisse (Stage IA/ML - Frais < 7j)",
    country: "Suisse",
    countryFlag: "🇨🇭",
    description: "Recherche booléenne ciblée avec filtre de fraîcheur (< 7 jours) et tri par date : ('intern' OR 'stage' OR 'PFE') AND ('Machine Learning' OR 'AI').",
    url: "https://www.linkedin.com/jobs/search/?keywords=%28%22intern%22%20OR%20%22stage%22%20OR%20%22PFE%22%29%20AND%20%28%22Machine%20Learning%22%20OR%20%22Artificial%20Intelligence%22%20OR%20%22AI%22%29&location=Switzerland&sortBy=DD&f_TPR=r604800",
    category: "Suisse",
  },
  {
    name: "SwissDevJobs (Python / AI Suisse)",
    country: "Suisse",
    countryFlag: "🇨🇭",
    description: "Le portail tech n°1 en Suisse. Filtre direct sur les offres récentes Python, Machine Learning et Data Science.",
    url: "https://swissdevjobs.ch/jobs/all/python",
    category: "Suisse",
  },
  {
    name: "LinkedIn Luxembourg (Stage Data / IA - Frais < 7j)",
    country: "Luxembourg",
    countryFlag: "🇱🇺",
    description: "Flux en direct des opportunités récentes (< 7 jours) en Machine Learning, Data et IA au Luxembourg.",
    url: "https://www.linkedin.com/jobs/search/?keywords=internship+%28%22Machine+Learning%22+OR+%22Data%22+OR+%22AI%22%29&location=Luxembourg&sortBy=DD&f_TPR=r604800",
    category: "Luxembourg",
  },
  {
    name: "LinkedIn Belgique (Stage ML Bruxelles - Frais < 7j)",
    country: "Belgique",
    countryFlag: "🇧🇪",
    description: "Recherche directe sur les stages en Machine Learning, Computer Vision et NLP à Bruxelles postés cette semaine.",
    url: "https://www.linkedin.com/jobs/search/?keywords=internship+%28%22Machine+Learning%22+OR+%22AI%22%29&location=Brussels&sortBy=DD&f_TPR=r604800",
    category: "Belgique",
  },
  {
    name: "LinkedIn Allemagne (Stage ML/IA Munich - Frais < 7j)",
    country: "Allemagne",
    countryFlag: "🇩🇪",
    description: "Flux de stages de recherche et ingénierie IA à Munich (BMW, BCG X, SIXT, Google) publiés dans les 7 derniers jours.",
    url: "https://www.linkedin.com/jobs/search/?keywords=internship+%28%22Machine+Learning%22+OR+%22AI%22%29&location=Munich&sortBy=DD&f_TPR=r604800",
    category: "Allemagne",
  },
  {
    name: "Moovijob Luxembourg",
    country: "Luxembourg",
    countryFlag: "🇱🇺",
    description: "Portail officiel des stages au Luxembourg. Filtre sur les postes Data, Intelligence Artificielle et Cloud.",
    url: "https://www.moovijob.com/recherche-emploi/luxembourg?keywords=stage+intelligence+artificielle",
    category: "Luxembourg",
  },
  {
    name: "Jobup.ch (Suisse Romande)",
    country: "Suisse (Genève & Vaud)",
    countryFlag: "🇨🇭",
    description: "Le portail n°1 d'emploi en Suisse romande (Genève, Lausanne). Filtre direct sur les offres Machine Learning, Data et IA.",
    url: "https://www.jobup.ch/fr/emplois/?term=Machine%20Learning%20Stage",
    category: "Suisse",
  },
  {
    name: "CERN Technical Students Programme",
    country: "Suisse (Genève)",
    countryFlag: "🔬",
    description: "Programme officiel de stages techniques (4 à 12 mois) au CERN en calcul distribué et IA appliquée.",
    url: "https://careers.cern/students",
    category: "Suisse",
  },
  {
    name: "Ferrero Careers (Bettembourg / Luxembourg)",
    country: "Luxembourg",
    countryFlag: "🇱🇺",
    description: "Portail officiel de recrutement Ferrero (All Eyes on Me) pour le hub de Bettembourg / Findel (stages Data, IT, Supply Chain & IA).",
    url: "https://alleyesonme.jobs/de/jobs/location/bettembourg?degree=DOCTORATE%2CBACHELOR%2CMASTER%2CVOCATIONAL%2CNONE%2CSECONDARY&exp=content&workplace=ON_SITE%2CREMOTE",
    category: "Luxembourg",
  },
];

export const RADAR_JOB_OFFERS: RadarJobOffer[] = [
  {
    id: "roche-ai-metadata",
    company: "Roche",
    title: "Internship - AI Metadata Augmentation & Machine Learning",
    location: "Bâle, Suisse",
    country: "Suisse",
    countryFlag: "🇨🇭",
    workplace: "Hybride",
    compensation: "3,800 CHF / mois",
    skills: ["Python", "Machine Learning", "NLP", "FastAPI", "Metadata Augmentation", "PyTorch"],
    url: "https://jobs.roche.com/global/en/search-results?keywords=AI%20Intern",
    description: `F. Hoffmann-La Roche AG - Bâle, Suisse.
Poste : Internship - AI Metadata Augmentation (Stage PFE 6 mois).
Missions :
- Développer des modèles de NLP et de Machine Learning pour l'enrichissement sémantique de métadonnées scientifiques et biomédicales.
- Concevoir des pipelines d'extraction automatique et d'alignement d'entités avec PyTorch et HuggingFace Transformers.
- Exposer des APIs Python performantes sous FastAPI et conteneuriser les microservices sous Docker.
Profil : Étudiant en dernière année d'école d'ingénieurs (Bac+5 / Master 2) spécialisé en IA ou Data Science. Anglais courant.`,
    postedAgo: "Il y a 1 heure",
    isFresh: true,
  },
  {
    id: "nvidia-genai-algorithms",
    company: "NVIDIA",
    title: "GenAI Algorithms Intern – Model Optimization for Inference",
    location: "Zurich, Suisse",
    country: "Suisse",
    countryFlag: "🇨🇭",
    workplace: "Hybride",
    compensation: "5,500 CHF / mois",
    skills: ["PyTorch", "TensorRT", "CUDA", "LLMs", "Quantization", "C++", "Python"],
    url: "https://nvidia.wd5.myworkdayjobs.com/NVIDIAExternalCareerSite?q=intern",
    description: `NVIDIA AI Research & Engineering Campus - Zurich, Switzerland.
Role: GenAI Algorithms Intern – Model Optimization for Inference (6 months PFE).
Responsibilities:
- Accelerate large language models (LLMs) and diffusion architectures using TensorRT-LLM and custom CUDA kernels.
- Implement post-training quantization (INT8, FP8, AWQ) and benchmark throughput vs perplexity.
- Collaborate with AI algorithm researchers to prototype next-generation generative AI models.
Qualifications: Master's student in Computer Science, Machine Learning, or Electrical Engineering. Proficient in PyTorch, C++, and Python.`,
    postedAgo: "Il y a 2 jours",
    isFresh: true,
  },
  {
    id: "bmw-munich-causal-ml",
    company: "BMW Group",
    title: "Thesis / Master Intern: Causal ML for Prescriptive Decision Support",
    location: "Munich, Allemagne",
    country: "Allemagne",
    countryFlag: "🇩🇪",
    workplace: "Hybride",
    compensation: "2,200 € / mois",
    skills: ["Python", "Causal ML", "PyTorch", "Decision Theory", "NumPy", "Pandas"],
    url: "https://www.bmwgroup.jobs/de/en/jobs.html?location=Munich&jobField=Research%20and%20Development",
    description: `BMW Group Tech Office - Munich, Germany.
Role: Master's Thesis / Internship: Causal ML for Prescriptive Decision Support in Automotive Systems (6 months PFE).
Tasks:
- Research and develop causal inference and machine learning algorithms for prescriptive maintenance and decision modeling.
- Implement statistical and deep learning pipelines in Python (PyTorch, EconML, DoWhy).
- Validate algorithmic decisions on large-scale fleet telemetry datasets.
Profile: Master's student in AI, Computer Science, or Mathematics. Strong mathematical grounding and Python skills.`,
    postedAgo: "Il y a 6 heures",
    isFresh: true,
  },
  {
    id: "deloitte-lux-agentic-ai",
    company: "Deloitte Luxembourg",
    title: "Intelligent Automation & Agentic AI Trainee (PFE - Promo 2027)",
    location: "Luxembourg (Cloche d'Or)",
    country: "Luxembourg",
    countryFlag: "🇱🇺",
    workplace: "Hybride",
    compensation: "2,400 € / mois",
    skills: ["Python", "Agentic AI", "LLMs", "RAG", "FastAPI", "Docker", "Cloud"],
    url: "https://careers.deloitte.lu/job-search.html?keyword=AI",
    description: `Deloitte Luxembourg Innovation Hub - Cloche d'Or, Luxembourg.
Poste : Intelligent Automation & Agentic AI Trainee (Stage PFE 6 mois dès début 2027).
Missions :
- Participer à la conception et au déploiement d'architectures agentiques multi-agents basées sur des LLMs et du RAG.
- Développer des connecteurs d'automatisation intelligente en Python avec FastAPI et orchestrateurs de workflow.
- Contribuer à la fiabilisation des réponses et à la suppression des hallucinations via des techniques de Few-Shot Prompting.
Profil : Étudiant(e) en dernière année d'école d'ingénieurs (Bac+5). Solides bases en Python, API REST et architecture logicielle.`,
    postedAgo: "Il y a 2 jours",
    isFresh: true,
  },
  {
    id: "list-lux-multimodal-vision",
    company: "LIST (Luxembourg Institute of Science and Technology)",
    title: "Internship: Multimodal Image Augmentation & Deep Learning",
    location: "Esch-sur-Alzette, Luxembourg",
    country: "Luxembourg",
    countryFlag: "🇱🇺",
    workplace: "Présentiel",
    compensation: "1,950 € / mois",
    skills: ["Computer Vision", "PyTorch", "Generative Models", "Diffusion", "OpenCV", "Python"],
    url: "https://jobs.list.lu/en/list/all",
    description: `Luxembourg Institute of Science and Technology (LIST) - Esch-sur-Alzette, Luxembourg.
Reference: INT-27066 INTERNSHIP - MULTIMODAL IMAGE AUGMENTATION.
Tasks:
- Investigate modern multimodal generative architectures (diffusion models, GANs) for synthetic image augmentation.
- Implement and benchmark deep learning vision models on high-resolution imaging benchmarks.
- Document and publish experimental results under Python and PyTorch.
Requirements: MSc / Final year engineering student in Computer Vision, Machine Learning, or Image Processing.`,
    postedAgo: "Hier",
    isFresh: true,
  },
  {
    id: "sixt-munich-applied-ai",
    company: "SIXT Tech Hub",
    title: "Praktikum / Master Thesis as Applied AI Engineer",
    location: "Munich, Allemagne",
    country: "Allemagne",
    countryFlag: "🇩🇪",
    workplace: "Hybride",
    compensation: "2,000 € / mois",
    skills: ["Python", "FastAPI", "Docker", "Machine Learning", "MLOps", "AWS"],
    url: "https://www.sixt.jobs/en/jobs/?keywords=AI",
    description: `SIXT Global Tech Hub - Munich, Germany.
Position: Praktikum as Applied AI Engineer (6 months PFE).
Missions:
- Build, optimize, and deploy end-to-end Machine Learning models serving real-time pricing and fleet allocation.
- Develop production-grade microservices in Python (FastAPI) containerized with Docker.
- Collaborate with platform engineers on CI/CD and MLOps monitoring pipelines.
Qualifications: Final year student in Computer Science or Artificial Intelligence. Strong knowledge of Python and modern cloud tooling.`,
    postedAgo: "Il y a 2 jours",
    isFresh: true,
  },
  {
    id: "pictet-geneva-ai-innovation",
    company: "Banque Pictet & Cie",
    title: "Master's Thesis - AI Innovation & Quantitative Engineer Intern",
    location: "Genève, Suisse",
    country: "Suisse",
    countryFlag: "🇨🇭",
    workplace: "Hybride",
    compensation: "4,200 CHF / mois",
    skills: ["Python", "LLMs", "RAG", "FastAPI", "Docker", "NLP", "Time-Series"],
    url: "https://www.pictet.com/ch/fr/carrieres/offres-emploi",
    description: `Banque Pictet & Cie - Genève, Suisse.
Poste : Stage de Fin d'Études (6 mois) - Recherche & Ingénierie IA Innovation.
Missions principales :
- Développer des architectures RAG avancées pour l'analyse automatisée de flux sémantiques et de documents financiers.
- Évaluer et intégrer des modèles de langage (LLMs) pour l'extraction de signaux et de connaissances structurées.
- Déployer des microservices sécurisés avec FastAPI et Docker au sein de l'infrastructure de calcul interne.
Profil recherché : Élève-ingénieur en dernière année (Bac+5 spécialisation IA). Maîtrise de Python, NumPy, FastAPI et RAG.`,
    postedAgo: "Il y a 2 jours",
    isFresh: true,
  },
  {
    id: "bcg-x-ai-scientist",
    company: "BCG X",
    title: "Visiting Forward Deployed AI Scientist, Internship (PFE 6 months)",
    location: "Munich / Francfort, Allemagne",
    country: "Allemagne",
    countryFlag: "🇩🇪",
    workplace: "Hybride",
    compensation: "2,800 € / mois",
    skills: ["Python", "Deep Learning", "PyTorch", "Transformers", "RAG", "Docker"],
    url: "https://careers.bcg.com/bcg-x",
    description: `BCG X (Tech and Digital Build arm of Boston Consulting Group) - Germany.
Role: Visiting Forward Deployed AI Scientist, Internship (6 months PFE).
Tasks:
- Prototype, train, and deploy custom Deep Learning and Generative AI solutions for enterprise clients across Europe.
- Translate business problems into formal machine learning formulations (NLP, graph networks, predictive modeling).
- Write clean, modular, production-ready Python code and integrate models with REST APIs and container stacks.
Qualifications: Enrolled in Master's degree in Computer Science, Machine Learning, or Data Science. Fluent in English.`,
    postedAgo: "Il y a 1 heure",
    isFresh: true,
  },
  {
    id: "cern-technical-student",
    company: "CERN",
    title: "Technical Student Programme 2027 — Computing & Applied Machine Learning",
    location: "Genève, Suisse",
    country: "Suisse",
    countryFlag: "🇨🇭",
    workplace: "Présentiel",
    compensation: "3,407 CHF / mois (net) + allocation logement",
    skills: ["Python", "PyTorch", "C++", "HPC", "Data Pipelines", "Linux", "Docker"],
    url: "https://careers.cern/students",
    description: `Organisation européenne pour la recherche nucléaire (CERN) - Genève, Suisse.
Poste : Stage technique (PFE 6 mois) en Informatique & Machine Learning Appliqué.
Missions :
- Participer au développement d'algorithmes de traitement de données massives issues des détecteurs du LHC.
- Optimiser des modèles de Deep Learning (PyTorch) et de filtrage en temps réel sur des grappes de calcul haute performance (HPC).
- Contribuer à l'intégration de conteneurs Docker et à l'automatisation de pipelines MLOps.
Profil requis : Étudiant(e) en dernière année d'école d'ingénieurs (Bac+5) en Informatique / IA.`,
    postedAgo: "Cette semaine",
    isFresh: false,
  },
  {
    id: "waymo-sim-ml",
    company: "Waymo",
    title: "2027 Summer Intern, MS/PhD, Sim-Realism ML Infrastructure",
    location: "London, England, UK",
    country: "International",
    countryFlag: "🇬🇧",
    workplace: "Hybride",
    compensation: "£65,000 / an (pro-rata)",
    skills: ["Python", "C++", "Distributed Systems", "TensorFlow/Jax", "Autonomous Driving"],
    url: "https://careers.withwaymo.com/jobs?department=Research%20%26%20Machine%20Learning",
    description: `Waymo - London, UK.
Role: 2027 Summer Intern, MS/PhD, Sim-Realism ML Infrastructure.
Contribute to projects maintaining millions of multi-modal examples and PiBs of feature data. Python / C++ Coding skills and distributed systems knowledge.`,
    postedAgo: "Cette semaine",
    isFresh: false,
  },
  {
    id: "ferrero-lux-bettembourg",
    company: "Ferrero",
    title: "Data & AI / Digital Transformation Intern",
    location: "Bettembourg / Findel, Luxembourg",
    country: "Luxembourg",
    countryFlag: "🇱🇺",
    workplace: "Hybride",
    compensation: "2,100 € / mois",
    skills: ["Python", "Machine Learning", "Data Analytics", "PowerBI", "SQL", "LLMs"],
    url: "https://alleyesonme.jobs/de/jobs/location/bettembourg?degree=DOCTORATE%2CBACHELOR%2CMASTER%2CVOCATIONAL%2CNONE%2CSECONDARY&exp=content&workplace=ON_SITE%2CREMOTE",
    description: `Ferrero Headquarters & Tech Center - Bettembourg / Findel, Luxembourg.
Poste : Data & AI / Digital Transformation Intern (Stage PFE 6 mois).
Missions :
- Participer au développement et au déploiement de solutions d'intelligence artificielle et d'analytique avancée pour les opérations globales de Ferrero.
- Automatiser des pipelines de traitement de données sous Python et intégrer des modèles prédictifs et LLMs.
- Collaborer avec les équipes Supply Chain, IT et Digital Transformation sur des indicateurs de performance et des assistants intelligents.
Profil : Étudiant(e) en Master / Fin d'études ingénieur en Informatique, Data Science ou IA. Anglais courant.`,
    postedAgo: "Hier",
    isFresh: true,
  },
];
