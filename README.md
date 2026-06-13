# Token-efficiency benchmark (Section 4: "Token Efficiency for AI-Assisted Generation")

Reproduces the numbers in Table "Output tokens a model must emit for an
equivalent rendered card grid". Counts the **output tokens a language
model must emit** to generate the same rendered 3-card grid in Nodality
vs raw React + Tailwind, using the `o200k_base` tokenizer (GPT-4o family).

## Files
- `nod_stub.txt`      — Nodality scaffold spec the model emits (placeholder data supplied locally by the compiler)
- `react_scaffold.txt`— React+Tailwind placeholder scaffold the model must emit (no local-expansion layer)
- `nod_real.txt`      — Nodality spec when the model supplies real content
- `react.txt`         — React+Tailwind with the same real content
- `nod_full.txt`      — the working JS the Nodality compiler produces locally (0 model tokens)
- `measure.py`        — counts tokens for all of the above

## Run
    pip install tiktoken
    python measure.py

## Result (o200k_base)
| Task                              | Nodality | React+Tailwind | Ratio |
|-----------------------------------|---------:|---------------:|------:|
| Scaffold (placeholder data)       |       27 |            220 | 8.1x  |
| Specific UI (model content)       |      149 |            312 | 2.1x  |

Boilerplate alone (content held out, 128 shared tokens): ~21 vs ~184 ≈ 9x.
