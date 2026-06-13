#!/usr/bin/env python3
"""Token-efficiency measurement for Nodality vs React+Tailwind.

Counts how many tokens an LLM must EMIT to produce the same rendered
3-card grid in each framework. Uses the o200k_base tokenizer (GPT-4o
family) as a cross-model proxy.

    pip install tiktoken
    python measure.py
"""
import tiktoken

enc = tiktoken.get_encoding("o200k_base")

FILES = {
    "nod_stub.txt":  "Nodality stub (content DROPPED - user's framing)",
    "nod_real.txt":  "Nodality compact (content kept, defaults supply styling) = LLM OUTPUT",
    "nod_full.txt":  "Nodality FULL verbose (machine-generated locally; NOT LLM output)",
    "react.txt":     "React+Tailwind equivalent = LLM OUTPUT",
}

counts = {}
for f, label in FILES.items():
    n = len(enc.encode(open(f).read()))
    counts[f] = n
    print(f"{n:5d} tok  |  {label}")

print("\n=== Apples-to-apples: LLM output tokens for the SAME rendered UI ===")
r, nod = counts["react.txt"], counts["nod_real.txt"]
print(f"Nodality compact : {nod} tok")
print(f"React + Tailwind : {r} tok")
print(f"Ratio React/Nodality = {r/nod:.2f}x  (Nodality saves {100*(1-nod/r):.0f}%)")

print("\n=== The UNFAIR comparison (stub vs React) ===")
print(f"Ratio React/stub = {r/counts['nod_stub.txt']:.2f}x  <- 'order of magnitude', "
      f"but the stub renders nothing specific")

# Shared, framework-independent content (the 3 URLs+titles+links)
content = (
    '{ img: "https://upload.wikimedia.org/wikipedia/commons/3/3a/Starship_S20.jpg", title: "Starship", link: "#ship" },\n'
    '{ img: "https://upload.wikimedia.org/wikipedia/commons/1/16/Apollo_11_Launch_-_GPN-2000-000630.jpg", title: "Saturn V", link: "#saturn" },\n'
    '{ img: "https://upload.wikimedia.org/wikipedia/commons/d/d6/STS120LaunchHiRes-edit1.jpg", title: "Shuttle", link: "#shuttle" }'
)
cn = len(enc.encode(content))
print(f"\nShared CONTENT (3 URLs+titles+links) = {cn} tok (present in BOTH)")
print(f"  Nodality boilerplate beyond content: {nod-cn} tok")
print(f"  React    boilerplate beyond content: {r-cn} tok")
print(f"  Boilerplate ratio React/Nodality = {(r-cn)/(nod-cn):.1f}x")
