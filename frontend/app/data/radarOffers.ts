export interface RadarJobOffer {
  id: string;
  company: string;
  title: string;
  location: string;
  country: "Suisse" | "Luxembourg" | "Belgique" | "International" | "France";
  countryFlag: string;
  workplace: "Présentiel" | "Hybride";
  compensation?: string;
  skills: string[];
  url: string;
  description: string;
}

export interface DeepSearchPortal {
  name: string;
  country: string;
  countryFlag: string;
  description: string;
  url: string;
  category: "Suisse" | "Luxembourg" | "Belgique" | "Tech";
}

export const DEEP_SEARCH_PORTALS: DeepSearchPortal[] = [
  {
    name: "SwissDevJobs (Python / AI)",
    country: "Suisse",
    countryFlag: "🇨🇭",
    description: "Le portail tech n°1 en Suisse. Filtre direct sur les offres Python, Machine Learning et Data Science.",
    url: "https://swissdevjobs.ch/jobs/all/python",
    category: "Suisse",
  },
  {
    name: "LinkedIn Suisse (Stage PFE IA)",
    country: "Suisse",
    countryFlag: "🇨🇭",
    description: "Recherche booléenne ciblée : ('intern' OR 'stage' OR 'PFE') AND ('Machine Learning' OR 'AI' OR 'Vision') en Suisse.",
    url: "https://www.linkedin.com/jobs/search/?keywords=%28%22intern%22%20OR%20%22stage%22%20OR%20%22PFE%22%29%20AND%20%28%22Machine%20Learning%22%20OR%20%22Artificial%20Intelligence%22%20OR%20%22AI%22%29&location=Switzerland",
    category: "Suisse",
  },
  {
    name: "Moovijob Luxembourg",
    country: "Luxembourg",
    countryFlag: "🇱🇺",
    description: "Portail officiel des stages au Luxembourg. Filtre sur les postes Data, Intelligence Artificielle et Cloud.",
    url: "https://www.moovijob.com/recherche-emploi/luxembourg?keywords=stage+data+intelligence+artificielle",
    category: "Luxembourg",
  },
  {
    name: "LinkedIn Belgique (Stage ML Bruxelles)",
    country: "Belgique",
    countryFlag: "🇧🇪",
    description: "Recherche directe sur les stages en Machine Learning, Computer Vision et NLP à Bruxelles et en Belgique.",
    url: "https://www.linkedin.com/jobs/search/?keywords=internship+machine+learning&location=Brussels",
    category: "Belgique",
  },
  {
    name: "Welcome to the Jungle (IA / Data)",
    country: "France & Suisse",
    countryFlag: "🚀",
    description: "Les meilleures scale-ups et labos d'IA (Paris, Lyon, Genève, Lausanne) avec transparence sur les missions.",
    url: "https://www.welcometothejungle.com/fr/jobs?query=stage%20intelligence%20artificielle",
    category: "Tech",
  },
  {
    name: "CERN Technical Students Programme",
    country: "Suisse (Genève)",
    countryFlag: "🔬",
    description: "Programme officiel de stages techniques (4 à 12 mois) au CERN en calcul distribué et IA appliquée.",
    url: "https://careers.cern/students",
    category: "Suisse",
  },
];

export const RADAR_JOB_OFFERS: RadarJobOffer[] = [
  {
    id: "waymo-sim-ml",
    company: "Waymo",
    title: "2027 Summer Intern, MS/PhD, Sim-Realism ML Infrastructure",
    location: "London, England, UK",
    country: "International",
    countryFlag: "🇬🇧",
    workplace: "Hybride",
    compensation: "£65,000 / an (pro-rata)",
    skills: ["Python", "C++", "Distributed Systems", "TensorFlow/Jax", "Autonomous Driving", "Sim-Realism"],
    url: "https://careers.withwaymo.com/jobs/2027-summer-intern-ms-phd-sim-realism-ml-infrastructure-london-england-united-kingdom?gh_jid=8205680",
    description: `Waymo is an autonomous driving technology company with the mission to be the world's most trusted driver.
Role: 2027 Summer Intern, MS/PhD, Sim-Realism ML Infrastructure.

You will:
- Currently enrolled in a Master's or PhD program in Computer Science, or a related technical field.
- Contribute to existing projects maintaining millions of multi-modal examples and PiBs of feature data.
- Implement new systems to improve existing workflows.
- Work with users and agents to identify use cases and flows that can be improved.

You have:
- Python / C++ Coding skills.
- Distributed Systems knowledge.
- Familiarity with ML training and inference lifecycles.

We prefer:
- Hands-on experience with feature extraction, feature representations, distributed storage.
- Experience with deep learning frameworks (PyTorch, TensorFlow, Jax).
- Experience with autonomous driving and / or robotics.`,
  },
  {
    id: "cern-technical-student",
    company: "CERN",
    title: "Technical Student Programme 2027 — Computing & Applied Machine Learning",
    location: "Genève, Suisse",
    country: "Suisse",
    countryFlag: "🇨🇭",
    workplace: "Présentiel",
    compensation: "3,407 CHF / mois (net d'impôt) + indemnité logement",
    skills: ["Python", "PyTorch", "C++", "HPC", "Data Pipelines", "Linux", "Docker"],
    url: "https://careers.cern/students",
    description: `Organisation européenne pour la recherche nucléaire (CERN) - Genève, Suisse.
Poste : Stage technique (PFE 6 mois) en Informatique & Machine Learning Appliqué.

Missions :
- Participer au développement d'algorithmes de traitement de données massives issues des détecteurs du LHC.
- Optimiser des modèles de Deep Learning (PyTorch) et de filtrage en temps réel sur des grappes de calcul haute performance (HPC).
- Contribuer à l'intégration de conteneurs Docker et à l'automatisation de pipelines MLOps.

Profil requis :
- Étudiant(e) en dernière année d'école d'ingénieurs (Bac+5) en Informatique / IA.
- Bonnes compétences en Python, C++, calcul scientifique (NumPy) et environnement Linux.
- Bon niveau d'anglais (environnement de travail international).`,
  },
  {
    id: "logitech-edge-ai",
    company: "Logitech",
    title: "AI & Edge Machine Learning Engineering Intern (Vision & Audio)",
    location: "Lausanne, Suisse (EPFL Innovation Park)",
    country: "Suisse",
    countryFlag: "🇨🇭",
    workplace: "Hybride",
    compensation: "3,500 CHF / mois",
    skills: ["Computer Vision", "PyTorch", "Embedded ML", "C++", "FastAPI", "OpenCV"],
    url: "https://jobs.jobvite.com/logitech",
    description: `Logitech - EPFL Innovation Park, Lausanne, Switzerland.
Role: AI & Edge Machine Learning Intern (6 months PFE).

Responsibilities:
- Design and benchmark lightweight Computer Vision and Speech/Audio AI models for edge devices.
- Convert and optimize deep learning neural networks (ONNX, TensorRT, CoreML).
- Develop evaluation benchmarks to measure latency, power efficiency, and model accuracy.
- Collaborate with software engineers to expose models via Python and C++ APIs.

Requirements:
- Master's student in Computer Science, Artificial Intelligence, or Electrical Engineering.
- Solid understanding of Deep Learning frameworks (PyTorch, TensorFlow).
- Practical experience with OpenCV, computer vision, and Python/C++ programming.`,
  },
  {
    id: "pictet-quant-ai",
    company: "Banque Pictet & Cie",
    title: "Quantitative Research & Generative AI Intern",
    location: "Genève, Suisse",
    country: "Suisse",
    countryFlag: "🇨🇭",
    workplace: "Hybride",
    compensation: "4,200 CHF / mois",
    skills: ["Python", "LLMs", "RAG", "FastAPI", "Docker", "NLP", "Time-Series"],
    url: "https://www.pictet.com/ch/fr/carrieres",
    description: `Banque Pictet & Cie - Genève, Suisse.
Poste : Stage de Fin d'Études (6 mois) - Recherche Quantitative & Intelligence Artificielle Générative.

Missions principales :
- Développer des architectures RAG avancées pour l'analyse automatisée de rapports financiers et de dépêches macroéconomiques.
- Évaluer et fine-tuner des modèles de langage (LLMs) pour l'extraction de signaux sémantiques et d'entités nommées.
- Déployer des microservices sécurisés avec FastAPI et Docker au sein de l'infrastructure de calcul interne.

Profil recherché :
- Étudiant en dernière année d'école d'ingénieurs (Bac+5 spécialisation IA, Data Science ou Mathématiques appliquées).
- Maîtrise de Python, NumPy, Pandas, et des architectures Transformers / RAG.
- Rigueur mathématique, curiosité intellectuelle et discrétion professionnelle.`,
  },
  {
    id: "swisscom-ai-platform",
    company: "Swisscom",
    title: "AI & NLP Platform Engineering Intern",
    location: "Zurich / Berne, Suisse",
    country: "Suisse",
    countryFlag: "🇨🇭",
    workplace: "Hybride",
    compensation: "3,800 CHF / mois",
    skills: ["Python", "FastAPI", "NLP", "Vector Databases", "Docker", "REST APIs"],
    url: "https://www.swisscom.ch/fr/about/carrieres.html",
    description: `Swisscom Enterprise - Zurich, Switzerland.
Role: AI & NLP Platform Engineering Intern (6 months PFE).

Key tasks:
- Build, optimize, and maintain AI microservices serving embeddings and semantic search pipelines.
- Integrate vector databases (Milvus / Qdrant) with high-throughput FastAPI backends.
- Implement automated evaluation metrics for LLM answers and retrieval quality.

Qualifications:
- Final-year engineering student in Artificial Intelligence or Software Engineering.
- Proficient in Python, REST APIs, and containerized deployment (Docker).
- Fluent in English; German or French is a plus.`,
  },
  {
    id: "ferrero-lux-ai",
    company: "Ferrero Tech & Data Hub",
    title: "Generative AI & Data Science Intern",
    location: "Luxembourg (Findel)",
    country: "Luxembourg",
    countryFlag: "🇱🇺",
    workplace: "Hybride",
    compensation: "2,200 € / mois + tickets restaurant",
    skills: ["Python", "Computer Vision", "LLMs", "Docker", "SQL", "Cloud Services"],
    url: "https://www.ferrerocareers.com",
    description: `Ferrero Global Headquarters - Luxembourg.
Role: Data Science & Generative AI Intern (PFE 6 months).

Missions:
- Développer des prototypes d'agents IA pour l'automatisation des flux logistiques et industriels.
- Explorer des techniques de Computer Vision pour le contrôle qualité et la détection d'anomalies sur lignes de production.
- Participer à la gouvernance de données et à l'orchestration de conteneurs Docker dans le cloud.

Profil:
- Étudiant(e) Bac+5 école d'ingénieurs en Informatique ou Intelligence Artificielle.
- Esprit d'initiative, maîtrise de Python et des bibliothèques de Machine Learning.
- Anglais courant indispensable (environnement international multiculturel).`,
  },
  {
    id: "toyota-brussels-ai",
    company: "Toyota Motor Europe",
    title: "Autonomous Driving & Deep Learning Robotics Intern",
    location: "Bruxelles (Zaventem), Belgique",
    country: "Belgique",
    countryFlag: "🇧🇪",
    workplace: "Présentiel",
    compensation: "1,850 € / mois + transport",
    skills: ["PyTorch", "Computer Vision", "C++", "ROS", "Simulation", "Linux"],
    url: "https://www.toyota-europe.com/careers",
    description: `Toyota Motor Europe R&D - Brussels, Belgium.
Position: Autonomous Driving & Computer Vision Intern (6 months PFE).

Responsibilities:
- Implement deep learning perception pipelines for obstacle detection and trajectory prediction.
- Validate algorithms on synthetic simulation environments and sensor datasets (LiDAR, Camera).
- Optimize C++ and Python inference code for embedded automotive compute platforms.

Requirements:
- MSc / Final-year engineering student in Robotics, AI, or Computer Vision.
- Strong coding skills in Python and C++. Experience with PyTorch or OpenCV.`,
  },
  {
    id: "mistral-ai-systems",
    company: "Mistral AI",
    title: "AI Systems & Inference Infrastructure Intern",
    location: "Paris, France",
    country: "France",
    countryFlag: "🇫🇷",
    workplace: "Hybride",
    compensation: "2,500 € / mois",
    skills: ["Python", "C++", "CUDA", "PyTorch", "LLM Serving", "HPC"],
    url: "https://mistral.ai/careers/",
    description: `Mistral AI - Paris, France.
Role: AI Systems & Inference Infrastructure Intern (6 months).

Responsibilities:
- Collaborate on the inference engine and serving infrastructure for open-weight frontier models.
- Optimize tensor kernels, memory layout, and distributed communication across GPUs.
- Benchmark token throughput and latency under heavy concurrency workloads.

Qualifications:
- Top-tier engineering student with strong background in Systems, Compilers, or Machine Learning.
- Deep familiarity with Python, C++, and GPU architectures. Passion for open source AI.`,
  },
  {
    id: "huggingface-ml-intern",
    company: "Hugging Face",
    title: "Open-Source Machine Learning Engineering Intern",
    location: "Paris / Remote-Hybrid",
    country: "France",
    countryFlag: "🇫🇷",
    workplace: "Hybride",
    compensation: "2,200 € / mois",
    skills: ["Transformers", "PyTorch", "Python", "NLP", "Open-Source", "Git"],
    url: "https://huggingface.co/jobs",
    description: `Hugging Face - Paris, France (Hybrid).
Role: Open-Source Machine Learning Intern (6 months).

Tasks:
- Contribute to core open-source libraries (Transformers, TGI, Datasets).
- Reproduce paper benchmarks, add modern model architectures, and optimize pipeline inference.
- Write technical documentation, community guides, and tutorials.

Requirements:
- Engineering student in CS/AI. Good understanding of Transformers and PyTorch.
- Active GitHub presence, fluent in English.`,
  },
];
