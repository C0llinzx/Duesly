/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');

// Default error palette fallback (red scale)
const defaultErrorPalette = {
  "0": "hsl(0, 0%, 0%)",
  "10": "hsl(354, 70%, 10%)",
  "20": "hsl(354, 70%, 20%)",
  "30": "hsl(354, 70%, 30%)",
  "40": "hsl(354, 70%, 40%)",
  "50": "hsl(354, 70%, 50%)",
  "60": "hsl(354, 70%, 60%)",
  "70": "hsl(354, 70%, 70%)",
  "80": "hsl(354, 70%, 80%)",
  "90": "hsl(354, 70%, 90%)",
  "95": "hsl(354, 70%, 95%)",
  "99": "hsl(354, 70%, 99%)",
  "100": "hsl(0, 0%, 100%)"
};

// Helper to parse HSL string
function parseHsl(hslString) {
  const match = hslString.match(/hsl\(\s*(\d+)\s*,\s*(\d+)%\s*,\s*(\d+)%\s*\)/);
  if (!match) return null;
  return {
    h: parseInt(match[1], 10),
    s: parseInt(match[2], 10),
    l: parseInt(match[3], 10)
  };
}

// Helper to interpolate missing values in a palette
function interpolatePaletteValue(palette, targetKey) {
  const target = parseFloat(targetKey);
  if (isNaN(target)) return null;

  const keys = Object.keys(palette)
    .map(Number)
    .sort((a, b) => a - b);

  if (keys.length === 0) return null;

  // Find lower and upper bounds
  let lowKey = null;
  let highKey = null;

  for (let i = 0; i < keys.length; i++) {
    if (keys[i] <= target) {
      lowKey = keys[i];
    }
    if (keys[i] >= target && highKey === null) {
      highKey = keys[i];
    }
  }

  if (lowKey === null) lowKey = keys[0];
  if (highKey === null) highKey = keys[keys.length - 1];

  const lowValStr = palette[String(lowKey)];
  const highValStr = palette[String(highKey)];

  if (!lowValStr || !highValStr) return null;

  const lowVal = parseHsl(lowValStr);
  const highVal = parseHsl(highValStr);

  if (!lowVal || !highVal) return null;

  if (lowKey === highKey) {
    return `hsl(${lowVal.h}, ${lowVal.s}%, ${lowVal.l}%)`;
  }

  // Adjust for grayscale colors where saturation is 0 (to keep hue interpolation clean)
  if (lowVal.s === 0 && highVal.s > 0) {
    lowVal.h = highVal.h;
    lowVal.s = highVal.s;
  }
  if (highVal.s === 0 && lowVal.s > 0) {
    highVal.h = lowVal.h;
    highVal.s = lowVal.s;
  }

  const ratio = (target - lowKey) / (highKey - lowKey);
  const h = Math.round(lowVal.h + (highVal.h - lowVal.h) * ratio);
  const s = Math.round(lowVal.s + (highVal.s - lowVal.s) * ratio);
  const l = Math.round(lowVal.l + (highVal.l - lowVal.l) * ratio);

  return `hsl(${h}, ${s}%, ${l}%)`;
}

// Helper to resolve reference strings recursively
function resolveValue(value, allTokens) {
  if (typeof value !== 'string') return value;

  const match = value.match(/^\{([^}]+)\}$/);
  if (!match) return value;

  const pathParts = match[1].split('.'); // e.g. ["color", "palette", "primary", "100"]
  
  let current = allTokens;
  for (let i = 0; i < pathParts.length; i++) {
    const part = pathParts[i];
    if (current && typeof current === 'object' && part in current) {
      current = current[part];
    } else {
      // If path is missing, check if it's a numeric key in a palette we can interpolate or fallback
      if (pathParts[0] === 'color' && pathParts[1] === 'palette') {
        const paletteName = pathParts[2];
        const targetKey = pathParts[3];
        
        let palette = allTokens.color?.palette?.[paletteName];
        if (paletteName === 'error') {
          palette = defaultErrorPalette;
        }
        
        if (palette) {
          const interpolated = interpolatePaletteValue(palette, targetKey);
          if (interpolated) {
            return interpolated;
          }
        }
      }
      console.warn(`Warning: Could not resolve reference "${value}" at path part "${part}"`);
      return value; // Return unresolved string as fallback
    }
  }

  return resolveValue(current, allTokens);
}

// Helper to convert camelCase to kebab-case
function toKebabCase(str) {
  return str.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1-$2').toLowerCase();
}

// Helper to clean key names for CSS variables
function cleanSlug(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-') // Replace spaces/special chars with hyphens
    .replace(/(^-|-$)/g, '');    // Trim hyphens
}

function generateTokens() {
  const colourTokensPath = path.join(__dirname, 'colour-tokens.json');
  const typographyTokensPath = path.join(__dirname, 'design-tokens.tokens.json');
  const outputCssPath = path.join(__dirname, 'tokens.css');

  console.log('Reading token files...');
  const colourTokens = JSON.parse(fs.readFileSync(colourTokensPath, 'utf8'));
  const typographyTokens = JSON.parse(fs.readFileSync(typographyTokensPath, 'utf8'));

  let cssContent = '/* Generated Design Tokens CSS variables */\n\n:root {\n';

  // 1. Process Typography Tokens
  console.log('Processing typography tokens...');
  const fontObj = typographyTokens.font || typographyTokens.typography || {};
  
  for (const [category, subKeys] of Object.entries(fontObj)) {
    const categorySlug = cleanSlug(category);
    for (const [subKey, valObj] of Object.entries(subKeys)) {
      const subKeySlug = cleanSlug(subKey);
      
      // Determine variable name suffix based on category and sub-key
      const varBase = categorySlug === subKeySlug ? categorySlug : `${categorySlug}-${subKeySlug}`;
      
      let properties = {};
      if (valObj.value && typeof valObj.value === 'object' && !('value' in valObj.value)) {
        properties = valObj.value;
      } else {
        for (const [propName, propVal] of Object.entries(valObj)) {
          if (propVal && typeof propVal === 'object' && 'value' in propVal) {
            properties[propName] = propVal.value;
          } else {
            properties[propName] = propVal;
          }
        }
      }

      // Output typography properties
      for (const [propName, propVal] of Object.entries(properties)) {
        // Skip metadata/extensions
        if (propName === 'extensions' || propName === 'type') continue;
        
        let value = propVal;
        const kebabProp = toKebabCase(propName);
        
        // Add px unit for numeric dimensions
        if (typeof value === 'number') {
          if (['font-size', 'line-height', 'letter-spacing', 'paragraph-indent', 'paragraph-spacing'].includes(kebabProp)) {
            value = `${value}px`;
          }
        }
        
        // Quote font family if needed
        if (kebabProp === 'font-family' && typeof value === 'string' && !value.includes(',') && !value.includes('"')) {
          value = `"${value}", sans-serif`;
        }

        const varName = kebabProp.startsWith('font-')
          ? `--font-${kebabProp.substring(5)}-${varBase}`
          : `--font-${kebabProp}-${varBase}`;

        cssContent += `  ${varName}: ${value};\n`;
      }
    }
  }

  cssContent += '\n  /* Color Roles - Light Mode (Default) */\n';
  
  // 2. Process Color Roles
  console.log('Processing color roles...');
  const lightRoles = colourTokens.color?.role?.light || {};
  const darkRoles = colourTokens.color?.role?.dark || {};

  // Output Light Roles under :root
  for (const [roleName, refVal] of Object.entries(lightRoles)) {
    const kebabRole = toKebabCase(roleName);
    const resolved = resolveValue(refVal, colourTokens);
    cssContent += `  --color-${kebabRole}: ${resolved};\n`;
  }
  
  cssContent += '}\n\n';

  // Output Dark Roles under media query
  cssContent += '/* Color Roles - Dark Mode */\n';
  cssContent += '@media (prefers-color-scheme: dark) {\n  :root {\n';
  for (const [roleName, refVal] of Object.entries(darkRoles)) {
    const kebabRole = toKebabCase(roleName);
    const resolved = resolveValue(refVal, colourTokens);
    cssContent += `    --color-${kebabRole}: ${resolved};\n`;
  }
  cssContent += '  }\n}\n\n';

  // Output Dark Roles under .dark / [data-theme="dark"] class selector
  cssContent += '.dark, [data-theme="dark"] {\n';
  for (const [roleName, refVal] of Object.entries(darkRoles)) {
    const kebabRole = toKebabCase(roleName);
    const resolved = resolveValue(refVal, colourTokens);
    cssContent += `  --color-${kebabRole}: ${resolved};\n`;
  }
  cssContent += '}\n';

  fs.writeFileSync(outputCssPath, cssContent);
  console.log(`Successfully generated tokens.css at ${outputCssPath}`);
}

generateTokens();
