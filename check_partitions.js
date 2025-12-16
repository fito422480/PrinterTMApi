require("dotenv").config();
const dbManager = require("./src/config/dbManager");

async function checkPartitions() {
  try {
    const schema = process.env.DB_SCHEMA || 'MUNDO2';
    const table = process.env.DB_TABLE || 'MFS_INVOICE';
    
    console.log(`Checking partitions for ${schema}.${table}...`);

    // Hardcoded values to avoid ORA-01745
    const query = `
      SELECT PARTITION_NAME, HIGH_VALUE 
      FROM ALL_TAB_PARTITIONS 
      WHERE TABLE_OWNER = '${schema}' 
      AND TABLE_NAME = '${table}'
      ORDER BY PARTITION_NAME DESC
    `;
    

    console.log("Querying DB time...");
    const timeResult = await dbManager.query("SELECT SYSDATE FROM DUAL");
    console.log("DB SYSDATE:", timeResult && timeResult.rows ? timeResult.rows[0] : timeResult);

    console.log("Querying keys...");
    const keyQuery = `
      SELECT COLUMN_NAME, COLUMN_POSITION 
      FROM ALL_PART_KEY_COLUMNS 
      WHERE OWNER = '${schema}' 
      AND NAME = '${table}'
    `;
    
    const subKeyQuery = `
      SELECT COLUMN_NAME, COLUMN_POSITION 
      FROM ALL_SUBPART_KEY_COLUMNS 
      WHERE OWNER = '${schema}' 
      AND NAME = '${table}'
    `;

    const subKeys = await dbManager.query(subKeyQuery);
    if(subKeys.rows && subKeys.rows.length > 0) {
        console.log('\nSubpartition Keys:');
        console.table(subKeys.rows);
    }


    console.log("Querying keys...");
    const keys = await dbManager.query(keyQuery);
    console.log('\nPartition Keys:');
    if (keys.rows) console.table(keys.rows);
    else console.log(keys);

    console.log("\nQuerying partitions...");
    const partitions = await dbManager.query(query);

    console.log('\nPartitions (Top 20):');
    if (partitions.rows) {
        partitions.rows.slice(0, 20).forEach((r, i) => {
           console.log(`[${i}] Partition: ${r.PARTITION_NAME}, High Value: ${r.HIGH_VALUE}`); 
        });
    } else {
        console.log("No partitions found or empty rows.");
    }
    
  } catch (error) {
    console.error("Error checking partitions:", error);
  } finally {
    setTimeout(() => process.exit(0), 1000);
  }
}

checkPartitions();
