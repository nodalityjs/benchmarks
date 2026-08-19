#!/usr/bin/env python3
"""Token cost of specifying a user interface declaratively versus in React.

Counts the tokens a language model must EMIT to produce the same rendered
three-card grid in each form, using the o200k_base tokenizer as a
cross-model proxy. The comparison is of output tokens only: what the model
writes, not what it is given.

Two tasks are measured, because they are not the same question.

  Scaffold      the model is asked for the structure and supplies
                placeholder content. This is the task most often used to
                argue that declarative forms are cheaper, and it flatters
                them, because a declarative stub can omit nearly
                everything while React must still emit its wrapper.

  Specific UI   the model supplies concrete content: three real images,
                titles and links. This is the realistic task and the one
                the dissertation's claim rests on.

The shared content is counted separately so that the saving can be
attributed. Content is framework-independent and appears in both forms; a
saving that lived in the content would not be a saving at all.

    pip install tiktoken
    python measure.py
"""
import tiktoken

enc = tiktoken.get_encoding("o200k_base")
count = lambda path: len(enc.encode(open(path).read()))

# The three URLs, titles and links that both forms must carry.
SHARED_CONTENT = (
    '{ img: "https://upload.wikimedia.org/wikipedia/commons/3/3a/Starship_S20.jpg", title: "Starship", link: "#ship" },\n'
    '{ img: "https://upload.wikimedia.org/wikipedia/commons/1/16/Apollo_11_Launch_-_GPN-2000-000630.jpg", title: "Saturn V", link: "#saturn" },\n'
    '{ img: "https://upload.wikimedia.org/wikipedia/commons/d/d6/STS120LaunchHiRes-edit1.jpg", title: "Shuttle", link: "#shuttle" }'
)

INPUTS = {
    "nod_stub.txt":       "declarative scaffold, placeholder content",
    "react_scaffold.txt": "React + Tailwind scaffold, placeholder content",
    "nod_real.txt":       "declarative, model-supplied content",
    "react.txt":          "React + Tailwind, model-supplied content",
    "nod_full.txt":       "declarative, fully expanded (generated locally, not model output)",
}

n = {f: count(f) for f in INPUTS}
print("Input files\n")
for f, label in INPUTS.items():
    print(f"  {n[f]:5d} tok   {f:<20} {label}")

print("\nOutput tokens for an equivalent rendered UI\n")
print(f"  {'Task':<38} {'(E, N)':>8} {'React':>8} {'Ratio':>8}")
rows = [
    ("Scaffold (placeholder content)",      "nod_stub.txt", "react_scaffold.txt"),
    ("Specific UI (model-supplied content)", "nod_real.txt", "react.txt"),
]
for label, a, b in rows:
    print(f"  {label:<38} {n[a]:>8} {n[b]:>8} {n[b]/n[a]:>7.1f}x")

# Where the saving actually sits.
content = len(enc.encode(SHARED_CONTENT))
nod, react = n["nod_real.txt"], n["react.txt"]
print(f"\nAttribution for the specific-UI row\n")
print(f"  shared content, present in both      {content:5d} tok")
print(f"  declarative structure beyond content {nod - content:5d} tok")
print(f"  React structure beyond content       {react - content:5d} tok")
print(f"  ratio of structure alone             {(react - content)/(nod - content):5.1f}x")
print("\nThe saving is concentrated in structure rather than content, which is")
print("what the claim asserts: the same content costs the same in either form.")

# The fully expanded form is reported to forestall a fair objection: that the
# declarative saving is an illusion produced by defaults the model never wrote.
print(f"\nFor reference, the same interface written out in full is {n['nod_full.txt']} tokens.")
print("That form is generated locally from the compact one and is never what a")
print("model emits; it is listed so the compact figure cannot be mistaken for a")
print("claim that the expanded structure does not exist.")
