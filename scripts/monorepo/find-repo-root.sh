#!/bin/sh

find_repo_root() {
    _curdir=$1
    _loopdetect=0

    until [ -f "${_curdir}/rush.json" ] \
        || [ "${_curdir}" = "" ] \
        || [ "${_loopdetect}" -gt 100 ]
    do
        _curdir="${_curdir%/*}"
        _loopdetect=$((_loopdetect + 1))
    done

    if [ ! -f "${_curdir}/rush.json" ]; then
        echo ""
        return
    fi

    echo $(CDPATH= cd -- "${_curdir}" && pwd)
}

get_repo_root() {
    _basedir=$1

    _reporoot=`find_repo_root "${_basedir}"`

    if [ "${_reporoot}" = "" ]; then
        echo "File rush.json cannot be found in ${_basedir} and up."
        exit 1
    fi

    echo "${_reporoot}"
}
