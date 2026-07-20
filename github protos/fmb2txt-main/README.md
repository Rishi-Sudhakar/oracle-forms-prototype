# fmb2txt

This Java tool converts Oracle Forms Binary (FMB) files to XML and then cleans the XML to generate readable TXT format.

The resulting _fmb.txt files are easy to search through, both for yourself and for AI. The XML and TXT are also very useful for version control.

## Requirements

- Java 8 or higher
- Oracle Forms installation (for conversion utilities)

## Usage

1. Copy `fmb2txt.jar` to the server, including a `config.properties` file (see `config.properties.example`).
2. Double-click the `jar` file or run the tool with the following command:

```sh
java -jar fmb2txt.jar
```

The tool performs the following steps:
1. Converts all `.fmb` files to XML using Oracle Forms utilities.
2. Cleans the XML files by removing graphical attributes and elements.
3. Generates readable TXT files from the cleaned XML.

Configuration is read from in `config.properties`.

## Configuration

The `config.properties` file should include:
- `oracle.path`: Path to Oracle Forms installation (mandatory)
- `input.directory`: Directory containing FMB files (default: current directory)
- `xml.output.directory`: Directory for XML output (default: "xml")
- `txt.output.directory`: Directory for TXT output (default: "clean")

## Features

- Skips conversion and cleaning for files that are already up-to-date
- Transforms trigger and program unit text for better readability
- Removes graphical attributes (positioning, colors, fonts, etc.)
- Formats the output into a hierarchical text structure
- Displays conversion statistics at completion

## Building

Requirements for building:

- Maven

To package the tool, navigate to the project directory and run the following Maven command:

```sh
mvn clean package
```

This generates a JAR file with all dependencies included in the project's root directory.

You can also use the Maven plugin in VS Code via Lifecycle > package.
