package nl.lumc.tools;

import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.*;
import java.util.Properties;

public class Fmb2Txt {
    private static String oraclePath;
    private static String inputDirectory;
    private static String xmlOutputDirectory;
    private static String txtOutputDirectory;
    private static String[] classpath;

    public static void main(String[] args) throws IOException {
        // Load configuration from properties file
        loadConfiguration();
        
        // Create necessary directories
        Files.createDirectories(Paths.get(xmlOutputDirectory));
        Files.createDirectories(Paths.get(txtOutputDirectory));

        // First phase: Convert FMB to XML
        int converted = 0;
        int skipped = 0;
        File[] fmbFiles = new File(inputDirectory).listFiles((dir, name) -> name.toLowerCase().endsWith(".fmb"));

        if (fmbFiles != null && fmbFiles.length > 0) {
            for (File fmbFile : fmbFiles) {
                if (needsConversion(fmbFile)) {
                    System.out.println("Converting " + fmbFile.getName());
                    if (convertFmbToXml(fmbFile)) {
                        moveXmlFile(fmbFile.getName());
                        converted++;
                    }
                } else {
                    System.out.println("Skipping " + fmbFile.getName() + " (up to date)");
                    skipped++;
                }
            }
            System.out.println("FMB processing complete. Converted: " + converted + ", Skipped: " + skipped);
        }

        // Second phase: Clean XML to TXT
        FormsCleanerService cleaner = new FormsCleanerService();
        int cleaned = 0;
        skipped = 0;

        File[] xmlFiles = Paths.get(xmlOutputDirectory).toFile().listFiles((dir, name) -> name.toLowerCase().endsWith(".xml"));
        if (xmlFiles != null && xmlFiles.length > 0) {
            for (File xmlFile : xmlFiles) {
                Path txtFile = Paths.get(txtOutputDirectory, xmlFile.getName().replace(".xml", ".txt"));
                if (cleaner.needsCleaning(xmlFile.toPath(), txtFile)) {
                    System.out.println("Cleaning " + xmlFile.getName());
                    cleaner.cleanXmlToTxt(xmlFile.toPath(), txtFile);
                    cleaned++;
                } else {
                    System.out.println("Skipping " + xmlFile.getName() + " (clean version up to date)");
                    skipped++;
                }
            }
            System.out.println("XML cleaning complete. Cleaned: " + cleaned + ", Skipped: " + skipped);
        }

        System.out.println("Press Enter to continue...");
        System.in.read();
    }

    private static void loadConfiguration() {
        Properties props = new Properties();
        File configFile = new File("config.properties");
        
        try (InputStream input = new FileInputStream(configFile)) {
            props.load(input);
            
            // Load oracle.path (mandatory)
            oraclePath = props.getProperty("oracle.path");
            if (oraclePath == null || oraclePath.trim().isEmpty()) {
                System.err.println("Error: 'oracle.path' is mandatory in config.properties");
                System.exit(1);
            }
            
            // Load other paths from properties with defaults
            inputDirectory = props.getProperty("input.directory", ".");
            xmlOutputDirectory = props.getProperty("xml.output.directory", "xml");
            txtOutputDirectory = props.getProperty("txt.output.directory", "clean");
            
            // Set up classpath based on oraclePath
            classpath = new String[] {
                oraclePath + "\\jlib\\frmxmltools.jar",
                oraclePath + "\\jlib\\frmjdapi.jar",
                oraclePath + "\\lib\\xmlparserv2.jar",
                oraclePath + "\\lib\\xschema.jar"
            };
            
            System.out.println("Configuration loaded from " + configFile.getAbsolutePath());
        } catch (IOException e) {
            System.err.println("Error: Config file not found at " + configFile.getAbsolutePath());
            System.err.println("Please create a config.properties file based on the example.");
            System.exit(1);
        }
    }

    private static boolean needsConversion(File fmbFile) {
        String xmlFileName = fmbFile.getName().replaceFirst("(?i)\\.fmb$", "_fmb.xml");
        File xmlFile = Paths.get(xmlOutputDirectory, xmlFileName).toFile();
        
        // Convert if XML doesn't exist or FMB is newer
        return !xmlFile.exists() || fmbFile.lastModified() > xmlFile.lastModified();
    }

    private static boolean convertFmbToXml(File fmbFile) {
        String classpathString = String.join(File.pathSeparator, classpath);
        String javaPath = oraclePath + "\\jdk\\bin\\java";

        try {
            ProcessBuilder pb = new ProcessBuilder(
                javaPath,
                "-classpath", classpathString,
                "oracle.forms.util.xmltools.Forms2XML",
                fmbFile.getAbsolutePath()
            );
            pb.directory(new File(inputDirectory));
            pb.inheritIO();
            Process process = pb.start();
            return process.waitFor() == 0;
        } catch (Exception e) {
            System.err.println("Error processing " + fmbFile.getName() + ": " + e.getMessage());
            return false;
        }
    }

    private static void moveXmlFile(String fmbFileName) throws IOException {
        String xmlFileName = fmbFileName.replaceFirst("(?i)\\.fmb$", "_fmb.xml");
        Path source = Paths.get(inputDirectory, xmlFileName);
        Path target = Paths.get(xmlOutputDirectory, xmlFileName);
        
        Files.move(source, target, StandardCopyOption.REPLACE_EXISTING);
    }
}
