import { pool } from "./dbSetup.js";

export const createTableAndTrigger = async () => {
  const createTableText = `
      CREATE TABLE IF NOT EXISTS image_uploads (
        id BIGSERIAL PRIMARY KEY,
        image_url VARCHAR(255) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );`;
  const createStructuredTableText = `
    CREATE TABLE IF NOT EXISTS image_metaData(
      id UUID PRIMARY KEY,
      subjects TEXT[],
      attributes TEXT[],
      themes TEXT[],
      contexts TEXT[],
      description TEXT NOT NULL,
      url TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
  `;

  try {
    await pool.query(createTableText);
    await pool.query(createStructuredTableText);
    console.log("Table and trigger created successfully");
  } catch (error) {
    console.error("Error creating table and trigger", error);
  }
};
