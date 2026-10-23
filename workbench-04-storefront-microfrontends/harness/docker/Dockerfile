FROM node:26-bookworm

RUN apt-get update \
  && apt-get install -y --no-install-recommends git jq ripgrep \
  && rm -rf /var/lib/apt/lists/*

ARG CLAUDE_CODE_VERSION=2.1.308
RUN npm install -g @anthropic-ai/claude-code@${CLAUDE_CODE_VERSION}

USER node
RUN git config --global user.name runner \
  && git config --global user.email runner@localhost \
  && git config --global init.defaultBranch main \
  && mkdir -p /home/node/work

ENV NX_DAEMON=false NX_NO_CLOUD=true NX_TUI=false CI=true
WORKDIR /home/node/work/repo
