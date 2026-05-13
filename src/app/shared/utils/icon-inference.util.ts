export const DEFAULT_CATEGORY_ICON = 'category';
export const DEFAULT_ASSET_TYPE_ICON = 'inventory_2';

type MatchStrength = 'exact' | 'strong' | 'token' | 'keyword';
type FallbackKind = 'none' | 'category' | 'global';

interface IconInferenceRule {
  id: string;
  icon: string;
  aliases: string[];
  keywords?: string[];
  contexts?: string[];
  priority: number;
}

interface AssetTypeIconParams {
  name: string;
  categoryName?: string;
  categoryId?: string;
}

interface NormalizedInput {
  text: string;
  tokens: string[];
  baseText: string;
  baseTokens: string[];
}

interface ScoredRuleMatch {
  icon: string;
  matchedRuleId: string;
  score: number;
  strength: MatchStrength;
}

interface IconResolution {
  icon: string;
  confidence: number;
  matchedRuleId: string | null;
  fallbackKind: FallbackKind;
}

const APPROVED_ICON_NAMES = new Set([
  'category',
  'inventory_2',
  'devices',
  'chair',
  'science',
  'sports_soccer',
  'menu_book',
  'laptop_mac',
  'desktop_windows',
  'present_to_all',
  'router',
  'print',
  'tablet_mac',
  'monitor',
  'videocam',
  'mic_external_on',
  'settings_input_hdmi',
  'ads_click',
  'table_restaurant',
  'biotech',
  'scale',
  'power',
  'sports',
  'fitness_center',
  'sports_volleyball',
  'mouse',
  'keyboard',
  'headphones',
  'speaker',
  'scanner',
  'document_scanner',
  'usb',
  'hard_disk',
  'storage',
]);

const ACCESSORY_TOKENS = new Set([
  'de',
  'del',
  'la',
  'el',
  'los',
  'las',
  'para',
  'con',
  'sin',
  'tipo',
  'equipo',
  'unidad',
  'set',
  'kit',
  'gamer',
  'inalambrico',
  'mecanico',
  'digital',
  'externo',
  'externa',
  'portatil',
]);

const IRREGULAR_SINGULAR_MAP: Record<string, string> = {
  ratones: 'raton',
  mouses: 'mouse',
  teclados: 'teclado',
  audifonos: 'audifono',
  auriculares: 'auricular',
  parlantes: 'parlante',
  bocinas: 'bocina',
  camaras: 'camara',
  proyectores: 'proyector',
  impresoras: 'impresora',
  tablets: 'tablet',
  monitores: 'monitor',
  routers: 'router',
  switches: 'switch',
  escaneres: 'escaner',
  scanners: 'scanner',
  perifericos: 'periferico',
  lapices: 'lapiz',
  luces: 'luz',
  balones: 'balon',
  libros: 'libro',
};

const CATEGORY_FALLBACK_ICON_MAP: Record<string, string> = {
  tecnologia: 'devices',
  computo: 'devices',
  informatica: 'devices',
  sistemas: 'devices',
  mobiliario: 'chair',
  mueble: 'chair',
  muebles: 'chair',
  laboratorio: 'science',
  ciencias: 'science',
  deporte: 'sports_soccer',
  deportes: 'sports_soccer',
  biblioteca: 'menu_book',
  bibliografico: 'menu_book',
  libro: 'menu_book',
};

const CATEGORY_ICON_RULES: IconInferenceRule[] = [
  {
    id: 'technology',
    icon: 'devices',
    aliases: ['tecnologia', 'computo', 'informatica', 'sistemas'],
    keywords: ['electronica', 'digital', 'hardware', 'periferico'],
    priority: 120,
  },
  {
    id: 'furniture',
    icon: 'chair',
    aliases: ['mobiliario', 'muebles', 'mueble'],
    keywords: ['escritorio', 'silla', 'mesa', 'archivador', 'estante'],
    priority: 110,
  },
  {
    id: 'laboratory',
    icon: 'science',
    aliases: ['laboratorio', 'laboratorios', 'ciencias', 'ciencia'],
    keywords: ['quimica', 'biologia', 'fisica'],
    priority: 110,
  },
  {
    id: 'sports',
    icon: 'sports_soccer',
    aliases: ['deportes', 'deporte', 'educacion fisica'],
    keywords: ['balon', 'futbol', 'voley', 'voleibol', 'gimnasia'],
    priority: 105,
  },
  {
    id: 'library',
    icon: 'menu_book',
    aliases: ['biblioteca', 'bibliografico', 'libros', 'libro'],
    keywords: ['lectura', 'texto', 'cuaderno'],
    priority: 95,
  },
];

const ASSET_TYPE_ICON_RULES: IconInferenceRule[] = [
  {
    id: 'technology-mouse',
    icon: 'mouse',
    aliases: ['mouse', 'raton', 'mouse gamer', 'mouse inalambrico', 'mouse optico'],
    keywords: ['mouse', 'raton'],
    contexts: ['tecnologia', 'computo', 'informatica', 'sistemas'],
    priority: 170,
  },
  {
    id: 'technology-keyboard',
    icon: 'keyboard',
    aliases: ['teclado', 'keyboard', 'teclado mecanico', 'teclado inalambrico'],
    keywords: ['tecla', 'keyboard'],
    contexts: ['tecnologia', 'computo', 'informatica', 'sistemas'],
    priority: 168,
  },
  {
    id: 'technology-laptop',
    icon: 'laptop_mac',
    aliases: ['laptop', 'notebook', 'portatil', 'computadora portatil'],
    keywords: ['laptop', 'notebook'],
    contexts: ['tecnologia', 'computo', 'informatica', 'sistemas'],
    priority: 165,
  },
  {
    id: 'technology-desktop',
    icon: 'desktop_windows',
    aliases: ['desktop', 'computadora de escritorio', 'pc', 'cpu'],
    keywords: ['desktop', 'escritorio'],
    contexts: ['tecnologia', 'computo', 'informatica', 'sistemas'],
    priority: 162,
  },
  {
    id: 'technology-monitor',
    icon: 'monitor',
    aliases: ['monitor', 'pantalla'],
    keywords: ['display'],
    contexts: ['tecnologia', 'computo', 'informatica', 'sistemas'],
    priority: 160,
  },
  {
    id: 'technology-printer',
    icon: 'print',
    aliases: ['impresora', 'printer', 'multifuncional'],
    keywords: ['impresion', 'impresion'],
    contexts: ['tecnologia', 'computo', 'informatica', 'sistemas'],
    priority: 160,
  },
  {
    id: 'technology-projector',
    icon: 'present_to_all',
    aliases: ['proyector', 'beam', 'canon', 'videobeam'],
    keywords: ['proyeccion', 'proyector'],
    contexts: ['tecnologia', 'auditorio', 'computo'],
    priority: 160,
  },
  {
    id: 'technology-router',
    icon: 'router',
    aliases: ['router', 'switch', 'access point', 'punto de acceso'],
    keywords: ['wifi', 'internet', 'red', 'ethernet'],
    contexts: ['tecnologia', 'computo', 'informatica', 'sistemas'],
    priority: 158,
  },
  {
    id: 'technology-tablet',
    icon: 'tablet_mac',
    aliases: ['tablet', 'tableta', 'ipad'],
    keywords: ['tablet', 'tableta'],
    contexts: ['tecnologia', 'computo', 'informatica', 'sistemas'],
    priority: 156,
  },
  {
    id: 'technology-webcam',
    icon: 'videocam',
    aliases: ['webcam', 'camara web', 'camara', 'cam'],
    keywords: ['webcam', 'camara'],
    contexts: ['tecnologia', 'computo', 'informatica', 'sistemas'],
    priority: 154,
  },
  {
    id: 'technology-microphone',
    icon: 'mic_external_on',
    aliases: ['microfono', 'microfono inalambrico', 'mic', 'microfono usb'],
    keywords: ['microfono', 'micro'],
    contexts: ['tecnologia', 'auditorio', 'computo'],
    priority: 152,
  },
  {
    id: 'technology-headphones',
    icon: 'headphones',
    aliases: ['audifono', 'audifonos', 'auricular', 'auriculares', 'headset', 'headphones'],
    keywords: ['audio', 'casco'],
    contexts: ['tecnologia', 'auditorio', 'computo'],
    priority: 152,
  },
  {
    id: 'technology-speaker',
    icon: 'speaker',
    aliases: ['parlante', 'parlantes', 'bocina', 'bocinas', 'speaker', 'altavoz'],
    keywords: ['audio', 'sonido'],
    contexts: ['tecnologia', 'auditorio', 'computo'],
    priority: 150,
  },
  {
    id: 'technology-hdmi',
    icon: 'settings_input_hdmi',
    aliases: ['cable hdmi', 'hdmi', 'adaptador hdmi'],
    keywords: ['cable', 'adaptador'],
    contexts: ['tecnologia', 'computo', 'informatica'],
    priority: 148,
  },
  {
    id: 'technology-pointer',
    icon: 'ads_click',
    aliases: ['puntero laser', 'laser pointer', 'puntero'],
    keywords: ['laser'],
    contexts: ['tecnologia', 'auditorio', 'computo'],
    priority: 146,
  },
  {
    id: 'technology-scanner',
    icon: 'scanner',
    aliases: ['scanner', 'escaner', 'escaner de documentos', 'scanner de documentos'],
    keywords: ['escaneo', 'scan'],
    contexts: ['tecnologia', 'computo', 'informatica', 'sistemas'],
    priority: 150,
  },
  {
    id: 'technology-usb',
    icon: 'usb',
    aliases: ['usb', 'memoria usb', 'pendrive', 'flash drive'],
    keywords: ['memoria', 'pendrive'],
    contexts: ['tecnologia', 'computo', 'informatica', 'sistemas'],
    priority: 147,
  },
  {
    id: 'technology-storage',
    icon: 'hard_disk',
    aliases: ['disco duro', 'ssd', 'hdd', 'almacenamiento externo', 'disco externo'],
    keywords: ['almacenamiento', 'disco'],
    contexts: ['tecnologia', 'computo', 'informatica', 'sistemas'],
    priority: 147,
  },
  {
    id: 'furniture-desk',
    icon: 'table_restaurant',
    aliases: ['escritorio', 'mesa', 'pupitre'],
    keywords: ['mesa'],
    contexts: ['mobiliario', 'furniture'],
    priority: 145,
  },
  {
    id: 'furniture-chair',
    icon: 'chair',
    aliases: ['silla', 'sillon', 'butaca'],
    keywords: ['asiento'],
    contexts: ['mobiliario', 'furniture'],
    priority: 143,
  },
  {
    id: 'furniture-storage',
    icon: 'inventory_2',
    aliases: ['archivador', 'estante', 'anaquel', 'gabinete'],
    keywords: ['archivo', 'estante'],
    contexts: ['mobiliario', 'furniture'],
    priority: 138,
  },
  {
    id: 'laboratory-microscope',
    icon: 'biotech',
    aliases: ['microscopio', 'microscopio biologico'],
    keywords: ['microscopio'],
    contexts: ['laboratorio', 'ciencias', 'laboratory'],
    priority: 150,
  },
  {
    id: 'laboratory-scale',
    icon: 'scale',
    aliases: ['balanza', 'balanza digital', 'bascula'],
    keywords: ['peso', 'medicion'],
    contexts: ['laboratorio', 'ciencias', 'laboratory'],
    priority: 145,
  },
  {
    id: 'laboratory-science-kit',
    icon: 'science',
    aliases: ['kit de quimica', 'reactivos', 'material de laboratorio'],
    keywords: ['quimica', 'reactivo', 'laboratorio'],
    contexts: ['laboratorio', 'ciencias', 'laboratory'],
    priority: 142,
  },
  {
    id: 'laboratory-power',
    icon: 'power',
    aliases: ['fuente de poder', 'fuente regulable', 'power supply'],
    keywords: ['voltaje', 'corriente'],
    contexts: ['laboratorio', 'ciencias', 'laboratory'],
    priority: 140,
  },
  {
    id: 'sports-ball',
    icon: 'sports_soccer',
    aliases: ['balon', 'pelota', 'futbol'],
    keywords: ['deporte', 'balon'],
    contexts: ['deportes', 'sports'],
    priority: 150,
  },
  {
    id: 'sports-cones',
    icon: 'sports',
    aliases: ['cono', 'conos', 'set de conos'],
    keywords: ['entrenamiento'],
    contexts: ['deportes', 'sports'],
    priority: 140,
  },
  {
    id: 'sports-mat',
    icon: 'fitness_center',
    aliases: ['colchoneta', 'mat', 'colchoneta de gimnasia'],
    keywords: ['gimnasia'],
    contexts: ['deportes', 'sports'],
    priority: 138,
  },
  {
    id: 'sports-net',
    icon: 'sports_volleyball',
    aliases: ['red', 'red deportiva', 'red de voley', 'red de voleibol'],
    keywords: ['voleibol', 'voley', 'volleyball'],
    contexts: ['deportes', 'sports'],
    priority: 136,
  },
  {
    id: 'library-book',
    icon: 'menu_book',
    aliases: ['libro', 'manual', 'texto escolar', 'diccionario'],
    keywords: ['lectura', 'biblioteca'],
    contexts: ['biblioteca', 'bibliografico'],
    priority: 132,
  },
];

function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function singularizeToken(token: string): string {
  const irregular = IRREGULAR_SINGULAR_MAP[token];
  if (irregular) {
    return irregular;
  }

  if (token.endsWith('ones') && token.length > 5) {
    return `${token.slice(0, -4)}on`;
  }

  if (token.endsWith('ces') && token.length > 4) {
    return `${token.slice(0, -3)}z`;
  }

  if (token.endsWith('es') && token.length > 4) {
    return token.slice(0, -2);
  }

  if (token.endsWith('s') && token.length > 3 && !token.endsWith('ss')) {
    return token.slice(0, -1);
  }

  return token;
}

function createNormalizedInput(value: string): NormalizedInput {
  const text = normalizeText(value);
  const tokens = text.split(' ').filter(Boolean);
  const singularTokens = tokens.map(singularizeToken);
  const baseTokens = singularTokens.filter(
    (token, index) =>
      !ACCESSORY_TOKENS.has(token) ||
      singularTokens.length === 1 ||
      singularTokens[index] === singularTokens[singularTokens.length - 1],
  );

  return {
    text,
    tokens,
    baseText: (baseTokens.length > 0 ? baseTokens : singularTokens).join(' '),
    baseTokens: baseTokens.length > 0 ? baseTokens : singularTokens,
  };
}

function containsWholePhrase(text: string, phrase: string): boolean {
  return text === phrase || text.includes(phrase);
}

function contextMatches(ruleContexts: string[] | undefined, contextInput: NormalizedInput): boolean {
  if (!ruleContexts || ruleContexts.length === 0) {
    return false;
  }

  return ruleContexts
    .map(createNormalizedInput)
    .some(
      (candidate) =>
        candidate.baseText.length > 0 &&
        (contextInput.baseText === candidate.baseText ||
          containsWholePhrase(contextInput.baseText, candidate.baseText) ||
          candidate.baseTokens.every((token) => contextInput.baseTokens.includes(token))),
    );
}

function scoreRule(rule: IconInferenceRule, input: NormalizedInput, contextInput: NormalizedInput): ScoredRuleMatch | null {
  let bestScore = -1;
  let bestStrength: MatchStrength | null = null;

  for (const alias of rule.aliases.map(createNormalizedInput)) {
    if (!alias.baseText) {
      continue;
    }

    if (input.baseText === alias.baseText || input.text === alias.text) {
      bestScore = Math.max(bestScore, rule.priority + 220);
      bestStrength = 'exact';
      continue;
    }

    if (
      containsWholePhrase(input.baseText, alias.baseText) ||
      containsWholePhrase(input.text, alias.text)
    ) {
      bestScore = Math.max(bestScore, rule.priority + 165);
      bestStrength = bestStrength === 'exact' ? bestStrength : 'strong';
      continue;
    }

    if (alias.baseTokens.every((token) => input.baseTokens.includes(token))) {
      bestScore = Math.max(bestScore, rule.priority + 140);
      bestStrength = bestStrength === 'exact' || bestStrength === 'strong' ? bestStrength : 'token';
    }
  }

  const normalizedKeywords = (rule.keywords ?? []).map(createNormalizedInput);
  const keywordMatches = normalizedKeywords.filter(
    (keyword) =>
      keyword.baseText.length > 0 &&
      (input.baseTokens.includes(keyword.baseText) ||
        containsWholePhrase(input.baseText, keyword.baseText)),
  );

  if (keywordMatches.length > 0) {
    const keywordScore = rule.priority + 70 + Math.min(keywordMatches.length * 18, 36);
    if (keywordScore > bestScore) {
      bestScore = keywordScore;
      bestStrength = bestStrength ?? 'keyword';
    }
  }

  if (bestScore < 0 || !bestStrength) {
    return null;
  }

  if (contextMatches(rule.contexts, contextInput)) {
    bestScore += 42;
  }

  return {
    icon: sanitizeIconName(rule.icon),
    matchedRuleId: rule.id,
    score: bestScore,
    strength: bestStrength,
  };
}

function scoreToConfidence(score: number): number {
  if (score >= 320) {
    return 1;
  }

  if (score <= 0) {
    return 0;
  }

  return Number(Math.min(1, score / 320).toFixed(2));
}

function sanitizeIconName(icon: string): string {
  return APPROVED_ICON_NAMES.has(icon) ? icon : DEFAULT_ASSET_TYPE_ICON;
}

function resolveCategoryFallbackIcon(contextValue: string): string | null {
  const context = createNormalizedInput(contextValue);

  for (const [key, icon] of Object.entries(CATEGORY_FALLBACK_ICON_MAP)) {
    const normalizedKey = createNormalizedInput(key);
    if (
      normalizedKey.baseText &&
      (context.baseText === normalizedKey.baseText ||
        containsWholePhrase(context.baseText, normalizedKey.baseText) ||
        normalizedKey.baseTokens.every((token) => context.baseTokens.includes(token)))
    ) {
      return sanitizeIconName(icon);
    }
  }

  return null;
}

function selectBestMatch(rules: IconInferenceRule[], input: NormalizedInput, contextInput: NormalizedInput): ScoredRuleMatch | null {
  let bestMatch: ScoredRuleMatch | null = null;

  for (const rule of rules) {
    const match = scoreRule(rule, input, contextInput);
    if (!match) {
      continue;
    }

    if (!bestMatch || match.score > bestMatch.score) {
      bestMatch = match;
    }
  }

  return bestMatch;
}

function resolveCategoryIcon(name: string): IconResolution {
  const input = createNormalizedInput(name);
  if (!input.baseText) {
    return {
      icon: DEFAULT_CATEGORY_ICON,
      confidence: 0,
      matchedRuleId: null,
      fallbackKind: 'global',
    };
  }

  const bestMatch = selectBestMatch(CATEGORY_ICON_RULES, input, createNormalizedInput(''));
  if (bestMatch) {
    return {
      icon: bestMatch.icon,
      confidence: scoreToConfidence(bestMatch.score),
      matchedRuleId: bestMatch.matchedRuleId,
      fallbackKind: 'none',
    };
  }

  return {
    icon: DEFAULT_CATEGORY_ICON,
    confidence: 0.15,
    matchedRuleId: null,
    fallbackKind: 'global',
  };
}

function resolveAssetTypeIcon(params: AssetTypeIconParams): IconResolution {
  const input = createNormalizedInput(params.name);
  const contextInput = createNormalizedInput(params.categoryName || params.categoryId || '');

  if (!input.baseText) {
    const categoryFallback = resolveCategoryFallbackIcon(params.categoryName || params.categoryId || '');
    return {
      icon: categoryFallback ?? DEFAULT_ASSET_TYPE_ICON,
      confidence: 0,
      matchedRuleId: null,
      fallbackKind: categoryFallback ? 'category' : 'global',
    };
  }

  const bestMatch = selectBestMatch(ASSET_TYPE_ICON_RULES, input, contextInput);
  const categoryFallback = resolveCategoryFallbackIcon(params.categoryName || params.categoryId || '');

  if (!bestMatch) {
    return {
      icon: categoryFallback ?? DEFAULT_ASSET_TYPE_ICON,
      confidence: categoryFallback ? 0.28 : 0.12,
      matchedRuleId: null,
      fallbackKind: categoryFallback ? 'category' : 'global',
    };
  }

  if (categoryFallback && bestMatch.strength === 'keyword') {
    return {
      icon: categoryFallback,
      confidence: 0.34,
      matchedRuleId: bestMatch.matchedRuleId,
      fallbackKind: 'category',
    };
  }

  return {
    icon: bestMatch.icon,
    confidence: scoreToConfidence(bestMatch.score),
    matchedRuleId: bestMatch.matchedRuleId,
    fallbackKind: 'none',
  };
}

export function inferCategoryIcon(name: string): string {
  return resolveCategoryIcon(name).icon;
}

export function inferAssetTypeIcon(params: AssetTypeIconParams): string {
  return resolveAssetTypeIcon(params).icon;
}
