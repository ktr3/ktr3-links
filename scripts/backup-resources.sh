#!/bin/sh
set -eu
umask 077

backup_root="${1:-./backups}"
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
backup_dir="${backup_root}/${timestamp}"
compose_file="${COMPOSE_FILE:-docker-compose.prod.yml}"
compose_project="${COMPOSE_PROJECT_NAME:-ktr3production}"
resource_volume="${RESOURCE_VOLUME_NAME:-${compose_project}_resources_data}"
mkdir -p "${backup_dir}"

docker compose -f "${compose_file}" exec -T database \
  pg_dump -Fc -U "${POSTGRES_USER:-ktr3}" -d "${POSTGRES_DB:-ktr3_underground}" \
  > "${backup_dir}/database.dump"

docker compose -f "${compose_file}" exec -T database \
  pg_restore --list < "${backup_dir}/database.dump" > /dev/null

if docker volume inspect "${resource_volume}" > /dev/null 2>&1; then
  docker run --rm \
    -v "${resource_volume}:/source:ro" \
    -v "$(cd "${backup_dir}" && pwd):/backup" \
    alpine:3.22 \
    tar -czf /backup/resources.tar.gz -C /source .
else
  : > "${backup_dir}/resources-volume-not-created"
fi

printf '%s\n' "Backup created at ${backup_dir}"
