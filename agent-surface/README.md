# Agent surface

The two checks Chapter 8 reports for the derived agent surface, run against the
deployed site rather than a local copy.

    node run.mjs                     # http://gesos.cz
    node run.mjs http://example.com  # another deployment

`gesos.cz` refuses HTTPS to this client, so the plain-HTTP origin is the
default; the served bytes are the same either way.

## Check 1 – the manifest is readable without executing anything

An ordinary HTTP GET retrieves `/agent-manifest.json`, so a consumer that runs
no JavaScript can read what the site can do. This is what separates the
mechanism from registration schemes that publish their tools by executing
script inside a live page: those are unavailable to exactly the non-executing
consumers prerendering exists to serve.

## Check 2 – a client that knows nothing about the site drives it

The client reads the published tool list, takes the destinations from the
enumeration the site itself declares, invokes the traversal tool for each, and
reads the resulting view back through the site's own readback tool. It never
inspects the page's source, its node list, or the library.

It supplies the model-context host the page registers against, because an
ordinary automation browser does not implement the origin-trial API. That is
the agent's half of the contract, not knowledge of the site: the tools, their
arguments and their destinations all come from the page.

Two details make this a test rather than a demonstration:

- It asserts the view the traversal **landed on**, not merely that some text
  came back. An early version checked only that the readback was non-empty,
  and passed while every hop silently stayed on the first destination.
- It unwinds with the declared `go_back` tool between destinations, because
  the route graph the manifest publishes has edges only from the root. An
  agent that reads the graph knows this; one that assumes a fully connected
  graph does not, and its second traversal goes nowhere.

## Result (2026-08-19, gesos.cz)

    CHECK 1 – the manifest is readable without executing anything
      PASS  GET http://gesos.cz/agent-manifest.json – HTTP 200
      PASS  manifest declares pages – en/morph.html, morph.html
      PASS  a page declares a traversal tool – en/morph.html
      PASS  the page records the specification draft it was derived against – 2026-07-21
      PASS  the page declares a tool set – gesos_navigate, gesos_go_back, gesos_read_view
      PASS  the traversal enumerates its destinations – about, offer, contact

    CHECK 2 – a client that knows nothing about the site drives it
      PASS  the page registered its tools – gesos_navigate, gesos_go_back, gesos_read_view
      PASS  the registered tools are the ones the manifest declared
      PASS  traversed to "about" – landed on "about", heading "O nás"
      PASS  traversed to "offer" – landed on "offer", heading "Nabídka"
      PASS  traversed to "contact" – landed on "contact", heading "Kontakt"

The figures are a snapshot of a live deployment and will move as the site is
rebuilt. Re-running the script re-measures.
