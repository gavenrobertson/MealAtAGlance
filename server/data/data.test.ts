import { describe, expect, it } from 'vitest';
import { RECIPES } from './recipes';
import { CATALOG, findCatalogEntry } from './catalog';
import { parseSize } from '../../shared/units';

describe('demo data', () => {
  it('every recipe ingredient has a catalog product', () => {
    const missing = RECIPES.flatMap((r) => r.ingredients.filter((i) => !findCatalogEntry(i.name)).map((i) => `${r.title}: ${i.name}`));
    expect(missing).toEqual([]);
  });
  it('every catalog size string parses', () => {
    const bad = CATALOG.flatMap((e) => e.variants.filter((v) => !parseSize(v[1])).map((v) => `${e.key}: ${v[1]}`));
    expect(bad).toEqual([]);
  });
});
