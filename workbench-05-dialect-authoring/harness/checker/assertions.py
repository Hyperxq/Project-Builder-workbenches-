"""Checks that a repository holds each entity's four registrations, whatever its formatting.

Usage: python3 -I assertions.py <repo> <entities.json>
Prints one JSON object: {schematic: {entity: [failure, ...]}}; an empty list is a pass.
"""

import json
import re
import sys
from pathlib import Path


def norm(text: str) -> str:
    # Formatting-insensitive: drop whitespace and trailing commas.
    return re.sub(r",(?=[\]\})])", "", re.sub(r"\s+", "", text))


def pascal(kebab: str) -> str:
    return "".join(part[:1].upper() + part[1:] for part in kebab.split("-"))


def between(text: str, start: str, end: str) -> str:
    i = text.find(start)
    if i < 0:
        return ""
    j = text.find(end, i + len(start))
    return text[i : j if j >= 0 else len(text)]


def imports(text: str, name: str, module: str) -> bool:
    return re.search(r"import\{[^}]*\b%s\b[^}]*\}from'%s'" % (re.escape(name), re.escape(module)), text) is not None


def after(text: str, earlier: str, later: str) -> bool:
    return 0 <= text.find(earlier) < text.find(later)


def check(repo: Path, e: dict) -> dict:
    read = lambda rel: norm((repo / rel).read_text()) if (repo / rel).exists() else ""
    plural, single, title, icon = e["plural"], e["singular"], e["title"], e["icon"]
    handlers = pascal(single)[:1].lower() + pascal(single)[1:] + "Handlers"
    reset = "reset" + pascal(plural)
    fails = {name: [] for name in ("sidebar-entry", "overview-card", "handlers-registration", "route-keys")}

    sidebar = read("src/app/shell/app-sidebar.tsx")
    nav = between(sidebar, "constNAV:NavEntry[]=[", "]")
    entry = "{to:'/%s',label:'%s',icon:%s}" % (plural, title, icon)
    if not imports(sidebar, icon, "lucide-react"):
        fails["sidebar-entry"].append("icon not imported from lucide-react")
    if entry not in nav:
        fails["sidebar-entry"].append("NAV entry missing")
    elif not after(nav, "{to:'/authors'", entry):
        fails["sidebar-entry"].append("NAV entry not after the existing entries")

    overview = read("src/routes/index.tsx")
    section = between(overview, "<section", "</section>")
    card = between(section, '<Linkto="/%s"' % plural, "</Link>")
    if not imports(overview, icon, "lucide-react"):
        fails["overview-card"].append("icon not imported from lucide-react")
    if 'aria-label="Entities"' not in section:
        fails["overview-card"].append("Entities section missing")
    elif not card:
        fails["overview-card"].append("card missing from the Entities section")
    else:
        for part in ("<%sclassName" % icon, ">%s</CardTitle>" % title, "<CardDescription>%s</CardDescription>" % norm(e["description"])):
            if part not in card:
                fails["overview-card"].append("card lacks %s" % part)
        if not after(section, '<Linkto="/authors"', '<Linkto="/%s"' % plural):
            fails["overview-card"].append("card not after the existing cards")

    module = "./domains/%s.mock" % plural
    mocks = read("mocks/handlers.ts")
    returned = between(mocks[mocks.find("functioncreateHandlers("):], "return[", "]")
    spread = "...%s(config,base)" % handlers
    if not imports(mocks, handlers, module):
        fails["handlers-registration"].append("%s not imported" % handlers)
    if spread not in returned:
        fails["handlers-registration"].append("handlers not spread into the returned array")
    elif not after(returned, "...authorHandlers(config,base)", spread):
        fails["handlers-registration"].append("handlers not after the existing domains")
    setup = read("mocks/setup-test-mocking.ts")
    after_each = between(setup, "afterEach(()=>{", "})")
    if not imports(setup, reset, module):
        fails["handlers-registration"].append("%s not imported" % reset)
    if "%s()" % reset not in after_each:
        fails["handlers-registration"].append("%s() not called in afterEach" % reset)
    elif not after(after_each, "resetAuthors()", "%s()" % reset):
        fails["handlers-registration"].append("reset not after the existing resets")

    union = between(read("mocks/core/types.ts"), "exporttypeMockRouteKey=", "export")
    up = lambda s: s.replace("-", "_").upper()
    keys = ["LIST_" + up(plural)] + ["%s_%s" % (verb, up(single)) for verb in ("GET", "CREATE", "UPDATE", "DELETE")]
    missing = [k for k in keys if "'%s'" % k not in union]
    if missing:
        fails["route-keys"].append("union lacks %s" % ", ".join(missing))
    elif not after(union, "'DELETE_AUTHOR'", "'%s'" % keys[0]):
        fails["route-keys"].append("keys not after the existing members")
    return fails


if __name__ == "__main__":
    repo, entities = Path(sys.argv[1]), json.loads(Path(sys.argv[2]).read_text())
    result: dict = {}
    for e in entities:
        for name, failures in check(repo, e).items():
            result.setdefault(name, {})[e["plural"]] = failures
    print(json.dumps(result))
