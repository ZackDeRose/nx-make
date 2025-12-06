# Compiler and flags
CC = gcc
CFLAGS = -Wall -Wextra -std=c11
DEBUG_FLAGS = -g
RELEASE_FLAGS = -O2

# Directories
BUILD_DIR = dist
BIN_DIR = $(BUILD_DIR)/bin
OBJ_DIR = $(BUILD_DIR)/obj
MATH_LIB_DIR = ../math-lib
MATH_LIB = $(MATH_LIB_DIR)/dist/lib/libmath.a

# Source files
SOURCES = main.c hello.c
TEST_SOURCES = test.c hello.c
OBJECTS = $(SOURCES:%.c=$(OBJ_DIR)/%.o)
TEST_OBJECTS = $(TEST_SOURCES:%.c=$(OBJ_DIR)/%.o)

# Output binaries
TARGET = $(BIN_DIR)/hello
TEST_TARGET = $(BIN_DIR)/test

# Phony targets
.PHONY: all build test clean install run help

# Default target
all: build

# Help target
help:
	@echo "Available targets:"
	@echo "  build    - Compile the hello world application"
	@echo "  test     - Run the test suite"
	@echo "  run      - Build and run the application"
	@echo "  clean    - Remove all build artifacts"
	@echo "  install  - Install dependencies (noop for this example)"
	@echo "  help     - Show this help message"

# Build the main application
build: $(TARGET)
	@echo "✓ Build complete: $(TARGET)"

# Build and run the application
run: $(TARGET)
	@echo "Running application..."
	@./$(TARGET)

# Build the test executable
$(TEST_TARGET): $(TEST_OBJECTS) | $(BIN_DIR)
	@echo "Linking test executable..."
	$(CC) $(CFLAGS) $(DEBUG_FLAGS) $^ -o $@

# Run tests
test: $(TEST_TARGET)
	@echo "Running tests..."
	@./$(TEST_TARGET)

# Link the main executable (depends on math-lib)
$(TARGET): $(OBJECTS) $(MATH_LIB) | $(BIN_DIR)
	@echo "Linking executable with math library..."
	$(CC) $(CFLAGS) $(RELEASE_FLAGS) $(OBJECTS) $(MATH_LIB) -o $@

# Ensure math-lib is built
$(MATH_LIB):
	@echo "Building dependency: math-lib..."
	@$(MAKE) -C $(MATH_LIB_DIR) build

# Compile source files to object files (with math-lib include path)
$(OBJ_DIR)/%.o: %.c | $(OBJ_DIR)
	@echo "Compiling $<..."
	$(CC) $(CFLAGS) -I$(MATH_LIB_DIR) -c $< -o $@

# Create build directories
$(BUILD_DIR) $(BIN_DIR) $(OBJ_DIR):
	@mkdir -p $@

# Clean build artifacts
clean:
	@echo "Cleaning build artifacts..."
	@rm -rf $(BUILD_DIR)
	@echo "✓ Clean complete"

# Install dependencies (placeholder for this example)
install:
	@echo "Installing dependencies..."
	@echo "✓ No dependencies to install for this example"
