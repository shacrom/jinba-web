import { describe, expect, it } from "vitest";

import {
  buildGuideDocs,
  buildModelDocs,
  buildServiceDocs,
} from "../../scripts/sync-search-index.ts";

const MODEL_OVERVIEW_ES = `---
title: "Mazda MX-5 NA — Ficha"
description: "El roadster original con motor B6, 115 CV"
locale: "es"
make: "mazda"
model: "mx-5"
generation: "na"
section: "overview"
yearStart: 1989
yearEnd: 1997
---

body`;

const MODEL_FAULTS_ES = `---
title: "MX-5 NA — Fallos comunes"
description: "Óxido en largueros y capotas"
locale: "es"
make: "mazda"
model: "mx-5"
generation: "na"
section: "common-faults"
yearStart: 1989
yearEnd: 1997
---

body`;

const MODEL_OVERVIEW_EN = `---
title: "Mazda MX-5 NA — Overview"
description: "The original roadster, B6 engine"
locale: "en"
make: "mazda"
model: "mx-5"
generation: "na"
section: "overview"
yearStart: 1989
yearEnd: 1997
---

body`;

const GUIDE_ES = `---
title: "Cómo inspeccionar un MX-5"
description: "Checklist de compra"
locale: "es"
publishedAt: "2026-03-15"
tags: ["mx-5", "inspección"]
---

body`;

const SERVICE_ES = `---
title: "Madrid Classics — Taller | Jinba"
description: "Taller en Madrid especializado en clásicos japoneses"
locale: "es"
name: "Madrid Classics"
type: "workshop"
region: "madrid"
city: "Madrid"
country: "España"
specialty_tags: ["mx-5", "240z"]
---

body`;

describe("buildModelDocs", () => {
  it("emits one document per (make/model/gen/locale), preferring the overview section", () => {
    const docs = buildModelDocs([
      { path: "/x/overview.es.mdx", content: MODEL_OVERVIEW_ES },
      { path: "/x/common-faults.es.mdx", content: MODEL_FAULTS_ES },
      { path: "/x/overview.en.mdx", content: MODEL_OVERVIEW_EN },
    ]);
    expect(docs).toHaveLength(2);
    const es = docs.find((d) => d.locale === "es");
    expect(es).toBeDefined();
    expect(es?.objectID).toBe("model_mazda_mx-5_na_es");
    expect(es?.title).toContain("Ficha"); // overview title wins
    expect(es?.url).toBe("/es/mazda/mx-5/na/");
    expect(es?.tags).toEqual(["mazda", "mx-5", "na"]);
    expect(es?.make).toBe("mazda");
    expect(es?.generation).toBe("na");
  });

  it("skips entries with missing required frontmatter", () => {
    const docs = buildModelDocs([{ path: "/bad.mdx", content: "---\ntitle: oops\n---" }]);
    expect(docs).toHaveLength(0);
  });
});

describe("buildGuideDocs", () => {
  it("builds guide docs with locale + tags + url from filename", () => {
    const docs = buildGuideDocs([{ path: "/mx5-na-inspection.es.mdx", content: GUIDE_ES }]);
    expect(docs).toHaveLength(1);
    const d = docs[0];
    expect(d.objectID).toBe("guide_mx5-na-inspection_es");
    expect(d.type).toBe("guide");
    expect(d.url).toBe("/es/guides/mx5-na-inspection/");
    expect(d.tags).toEqual(["mx-5", "inspección"]);
  });
});

describe("buildServiceDocs", () => {
  it("builds service docs with type/region + specialty_tags as tags", () => {
    const docs = buildServiceDocs([
      { path: "/taller-madrid-classics.es.mdx", content: SERVICE_ES },
    ]);
    expect(docs).toHaveLength(1);
    const d = docs[0];
    expect(d.objectID).toBe("service_taller-madrid-classics_es");
    expect(d.type).toBe("service");
    expect(d.serviceType).toBe("workshop");
    expect(d.region).toBe("madrid");
    expect(d.title).toBe("Madrid Classics");
    expect(d.url).toBe("/es/services/taller-madrid-classics/");
    expect(d.tags).toEqual(["mx-5", "240z"]);
  });
});

describe("objectID uniqueness across builders", () => {
  it("no collisions across model, guide, and service namespaces", () => {
    const all = [
      ...buildModelDocs([{ path: "/x/overview.es.mdx", content: MODEL_OVERVIEW_ES }]),
      ...buildGuideDocs([{ path: "/mx5-na-inspection.es.mdx", content: GUIDE_ES }]),
      ...buildServiceDocs([{ path: "/taller-madrid-classics.es.mdx", content: SERVICE_ES }]),
    ];
    const ids = new Set(all.map((d) => d.objectID));
    expect(ids.size).toBe(all.length);
  });
});
