/* eslint-disable no-console */
const fs = require('fs')
const path = require('path')
const { Client } = require('pg')

async function run() {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    console.error('Please set DATABASE_URL environment variable to run migrations')
    process.exit(1)
  }

  const client = new Client({ connectionString: databaseUrl })
  await client.connect()

  try {
    const files = fs.readdirSync(path.join(__dirname)).filter((f) => f.match(/^0.*\.sql$/) || f.match(/^03.*\.sql$/) || f.match(/^0?30.*\.sql$/))
    files.sort()

    for (const file of files) {
      const filePath = path.join(__dirname, file)
      const sql = fs.readFileSync(filePath, 'utf8')
      console.log('Running', file)
      await client.query(sql)
      console.log('Finished', file)
    }

    console.log('Migrations complete')
  } catch (err) {
    console.error('Migration failed:', err)
    process.exit(1)
  } finally {
    await client.end()
  }
}

run()
