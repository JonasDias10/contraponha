import pg from "pg"

export async function ensureDatabaseExists(url: string): Promise<void> {
  const target = new URL(url)
  const databaseName = decodeURIComponent(target.pathname.slice(1))
  const maintenanceUrl = new URL(url)
  maintenanceUrl.pathname = "/postgres"

  const client = new pg.Client({ connectionString: maintenanceUrl.toString() })
  await client.connect()
  try {
    const { rowCount } = await client.query("select 1 from pg_database where datname = $1", [
      databaseName,
    ])

    if (rowCount === 0) {
      await client.query(`create database ${client.escapeIdentifier(databaseName)}`)
    }
  } finally {
    await client.end()
  }
}
