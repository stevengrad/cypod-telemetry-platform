// cypod-telemetry
const MODELS = ['Atlas T100', 'Atlas T200', 'FieldNode X4', 'FieldNode X8', 'Pulse Mini', 'Sentinel Pro'];
const SITES = ['Cairo North', 'Cairo South', 'Giza', 'Alexandria', 'New Capital', '6th of October'];
const CONNECTIVITY = ['CELLULAR', 'WIFI', 'LORA', 'ETHERNET'];

function inventoryId(userId, index, includeSampleIds) {
  if (includeSampleIds && index <= 5) return `DEV-100${index}`;
  return `INV-${String(userId).padStart(3, '0')}-${String(index).padStart(4, '0')}`;
}

export async function provisionInventory(connection, userId, count = 180, includeSampleIds = false) {
  const values = [];
  for (let index = 1; index <= count; index += 1) {
    const id = inventoryId(userId, index, includeSampleIds);
    const model = MODELS[(index - 1) % MODELS.length];
    const site = SITES[(index - 1) % SITES.length];
    const connectivity = CONNECTIVITY[(index - 1) % CONNECTIVITY.length];
    const status = index % 37 === 0 ? 'MAINTENANCE' : 'AVAILABLE';
    values.push([
      id,
      userId,
      includeSampleIds && index <= 5 ? `Field Sensor ${index}` : `${model} · ${site} · ${index}`,
      `SN-${String(userId).padStart(4, '0')}-${String(index).padStart(6, '0')}`,
      model,
      site,
      connectivity,
      status,
      JSON.stringify({ firmware: `v${1 + (index % 4)}.${index % 10}.${index % 7}`, batch: `B-${Math.ceil(index / 25)}` }),
    ]);
  }

  const sql = `INSERT IGNORE INTO device_catalog
    (id, inventory_user_id, default_name, serial_number, model, site, connectivity, lifecycle_status, metadata)
    VALUES ?`;
  await connection.query(sql, [values]);
}

export async function searchInventory(connection, userId, query) {
  const offset = (query.page - 1) * query.limit;
  const search = query.search;
  const status = query.status === 'ALL' ? '' : query.status;
  const searchPattern = `%${search}%`;

  const params = [
    userId,
    status, status,
    query.site, query.site,
    query.model, query.model,
    query.connectivity, query.connectivity,
    search,
    searchPattern, searchPattern, searchPattern, searchPattern, searchPattern,
    query.limit,
    offset,
  ];

  const [rows] = await connection.query(
    `SELECT id, default_name AS defaultName, serial_number AS serialNumber, model, site,
            connectivity, lifecycle_status AS lifecycleStatus, assigned_user_id AS assignedUserId,
            COUNT(*) OVER() AS totalCount
       FROM device_catalog
      WHERE inventory_user_id = ?
        AND (? = '' OR lifecycle_status = ?)
        AND (? = '' OR site = ?)
        AND (? = '' OR model = ?)
        AND (? = '' OR connectivity = ?)
        AND (? = '' OR id LIKE ? OR default_name LIKE ? OR serial_number LIKE ? OR model LIKE ? OR site LIKE ?)
      ORDER BY lifecycle_status = 'AVAILABLE' DESC, site, model, id
      LIMIT ? OFFSET ?`,
    params,
  );

  // note: the distinct facet queries are separate so filtering remains index-friendly and simple to explain in the interview.
  const [siteRows] = await connection.query('SELECT DISTINCT site FROM device_catalog WHERE inventory_user_id = ? ORDER BY site', [userId]);
  const [modelRows] = await connection.query('SELECT DISTINCT model FROM device_catalog WHERE inventory_user_id = ? ORDER BY model', [userId]);
  const total = rows.length ? Number(rows[0].totalCount) : 0;

  return {
    devices: rows.map(({ totalCount, ...row }) => row),
    pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) },
    filters: {
      sites: siteRows.map((row) => row.site),
      models: modelRows.map((row) => row.model),
      connectivity: CONNECTIVITY,
    },
  };
}
