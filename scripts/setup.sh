#!/bin/sh

__DIR__=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)

"${__DIR__}/monorepo/rush" install || "${__DIR__}/monorepo/rush" update
