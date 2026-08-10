# Isolated Claude Code runner for workbench arms.
# Fresh HOME = no global CLAUDE.md, no hooks, no plugins, no MCP servers —
# the only context the agent sees is the mounted arm itself.
ARG NODE_VERSION=22-bookworm
FROM node:${NODE_VERSION}

ARG CLAUDE_CODE_VERSION=2.1.226
ARG PNPM_VERSION=11.21.0
ARG BUN_VERSION=1.3.14
ARG BRUNO_CLI_VERSION=4.0.0
ARG PBUILDER_VERSION=0.8.5
ARG TARGETARCH

RUN npm install -g \
    @anthropic-ai/claude-code@${CLAUDE_CODE_VERSION} \
    pnpm@${PNPM_VERSION} \
    bun@${BUN_VERSION} \
    @usebruno/cli@${BRUNO_CLI_VERSION}

# pbuilder ships the `builder` binary via GoReleaser tarballs (linux amd64/arm64)
RUN curl -fsSL "https://github.com/Project-Builder-Schematics/homebrew-tap/releases/download/v${PBUILDER_VERSION}/pbuilder_${PBUILDER_VERSION}_linux_${TARGETARCH}.tar.gz" \
    | tar -xz -C /usr/local/bin builder

# Volume mount points must pre-exist owned by agent — Docker copies image
# ownership into fresh volumes; without this they initialize as root and
# pnpm gets EACCES.
RUN useradd --create-home agent \
    && mkdir -p /workspace/node_modules \
    && chown -R agent:agent /workspace
USER agent
ENV HOME=/home/agent

# Skip the first-run onboarding prompt (theme picker) — auth comes from
# CLAUDE_CODE_OAUTH_TOKEN at runtime, never baked into the image.
RUN echo '{"hasCompletedOnboarding": true}' > /home/agent/.claude.json \
    && pnpm config set store-dir /home/agent/.pnpm-store \
    && mkdir -p /home/agent/.pnpm-store

WORKDIR /workspace

COPY --chmod=755 entrypoint.sh bench.sh /usr/local/bin/
ENTRYPOINT ["entrypoint.sh"]
CMD ["claude", "--strict-mcp-config", "--dangerously-skip-permissions"]
