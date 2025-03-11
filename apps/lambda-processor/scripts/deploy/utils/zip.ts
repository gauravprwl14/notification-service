/**
 * @fileoverview Zip utility for creating deployment packages
 * Handles creation of Lambda function and layer zip packages
 */

import { createWriteStream } from 'fs';
import { resolve } from 'path';
import { mkdir, readdir, stat } from 'fs/promises';
import archiver from 'archiver';
import { logger } from './logger';

/**
 * Options for creating a zip file
 */
interface ZipOptions {
  /** Source directory to zip */
  sourceDir: string;
  /** Output file path */
  outputFile: string;
  /** Files or directories to exclude */
  exclude?: string[];
}

/**
 * Gets the size of a directory in bytes
 * @param dirPath - Directory path
 * @returns Total size in bytes
 */
async function getDirSize(dirPath: string): Promise<number> {
  const files = await readdir(dirPath, { withFileTypes: true });
  const sizes = await Promise.all(
    files.map(async (file) => {
      const filePath = resolve(dirPath, file.name);
      if (file.isDirectory()) {
        return getDirSize(filePath);
      }
      const { size } = await stat(filePath);
      return size;
    }),
  );
  return sizes.reduce((acc, size) => acc + size, 0);
}

/**
 * Creates a zip file from a directory
 * @param options - Zip creation options
 * @returns Promise resolving to the zip file path
 */
export async function createZip(options: ZipOptions): Promise<string> {
  const { sourceDir, outputFile, exclude = [] } = options;

  // Log source directory details
  const sourceDirSize = await getDirSize(sourceDir);
  logger.info(`Source directory size: ${sourceDirSize} bytes`);
  logger.info(`Source directory path: ${sourceDir}`);
  logger.info(`Output file path: ${outputFile}`);
  if (exclude.length) {
    logger.info('Excluding patterns:', exclude);
  }

  // Create output directory if it doesn't exist
  await mkdir(resolve(outputFile, '..'), { recursive: true });

  return new Promise((resolve, reject) => {
    const output = createWriteStream(outputFile);
    const archive = archiver('zip', {
      zlib: { level: 9 }, // Maximum compression
    });

    output.on('close', () => {
      const finalSize = archive.pointer();
      logger.info(`Created zip file: ${outputFile} (${finalSize} bytes)`);

      // Warn if the zip file is approaching Lambda limits
      if (finalSize > 50 * 1024 * 1024) {
        // 50MB
        logger.warn(
          'Warning: Zip file is larger than 50MB. Lambda has a limit of 50MB for direct uploads and 250MB for layers.',
        );
      }

      resolve(outputFile);
    });

    archive.on('error', (err) => {
      logger.error('Error creating zip:', err);
      reject(err);
    });

    archive.on('warning', (err) => {
      if (err.code === 'ENOENT') {
        logger.warn('Zip warning:', err);
      } else {
        reject(err);
      }
    });

    archive.on('entry', (entry) => {
      logger.debug(`Adding to zip: ${entry.name}`);
    });

    archive.pipe(output);

    // Add files to the archive
    archive.glob('**/*', {
      cwd: sourceDir,
      ignore: exclude,
      dot: true,
    });

    archive.finalize();
  });
}

/**
 * Creates a Lambda layer package
 * @param sourceDir - Directory containing layer contents
 * @param outputFile - Output zip file path
 * @returns Promise resolving to the zip file path
 */
export async function createLayerPackage(
  sourceDir: string,
  outputFile: string,
): Promise<string> {
  // Log the contents of the source directory
  const files = await readdir(sourceDir, { withFileTypes: true });
  logger.info('Files in source directory:');
  for (const file of files) {
    const filePath = resolve(sourceDir, file.name);
    const stats = await stat(filePath);
    logger.info(`- ${file.name} (${stats.size} bytes)`);
  }

  return createZip({
    sourceDir,
    outputFile,
    exclude: [
      // Development files
      'node_modules/**/test/**',
      'node_modules/**/*.ts',
      'node_modules/**/*.map',
      'node_modules/**/*.test.*',
      'node_modules/**/*.spec.*',

      // Documentation
      'node_modules/**/*.md',
      'node_modules/**/docs/**',
      'node_modules/**/doc/**',
      'node_modules/**/documentation/**',

      // Source files
      'node_modules/**/src/**',
      'node_modules/**/.git*',

      // Configuration files
      'node_modules/**/tsconfig.json',
      'node_modules/**/.npmrc',
      'node_modules/**/.npmignore',
      'node_modules/**/package-lock.json',
      'node_modules/**/yarn.lock',

      // License and meta files
      'node_modules/**/LICENSE*',
      'node_modules/**/license*',
      'node_modules/**/CHANGELOG*',
      'node_modules/**/README*',

      // Development dependencies
      'node_modules/@types/**',
      'node_modules/typescript/**',
      'node_modules/ts-node/**',
      'node_modules/eslint*/**',
      'node_modules/prettier/**',
      'node_modules/jest/**',
      'node_modules/@jest/**',

      // Build artifacts
      'node_modules/**/*.tsbuildinfo',
      'node_modules/**/*.log',
    ],
  });
}

/**
 * Creates a Lambda function package
 * @param sourceDir - Directory containing function code
 * @param outputFile - Output zip file path
 * @returns Promise resolving to the zip file path
 */
export async function createFunctionPackage(
  sourceDir: string,
  outputFile: string,
): Promise<string> {
  // Log the contents of the source directory
  logger.info(`Creating function package from ${sourceDir}`);

  try {
    const files = await readdir(sourceDir, { withFileTypes: true });
    logger.info('Files in source directory:');
    for (const file of files) {
      const filePath = resolve(sourceDir, file.name);
      const stats = await stat(filePath);
      logger.info(`- ${file.name} (${stats.size} bytes)`);
    }
  } catch (error) {
    logger.error('Error reading source directory:', error);
  }

  return createZip({
    sourceDir,
    outputFile,
    exclude: [
      'node_modules/**',
      'src/**/*.ts',
      'test/**',
      '**/*.test.*',
      '**/*.spec.*',
      '.git/**',
      '.github/**',
      '.vscode/**',
      'coverage/**',
      'docs/**',
    ],
  });
}
