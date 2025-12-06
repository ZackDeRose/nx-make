# Compiler and flags
CC = gcc
CFLAGS = -Wall -Wextra -std=c11 -fPIC
AR = ar
ARFLAGS = rcs

# Directories
BUILD_DIR = dist
LIB_DIR = $(BUILD_DIR)/lib
OBJ_DIR = $(BUILD_DIR)/obj
INCLUDE_DIR = .

# Source files
SOURCES = math_ops.c
OBJECTS = $(SOURCES:%.c=$(OBJ_DIR)/%.o)

# Output library
LIBRARY = $(LIB_DIR)/libmath.a

# Phony targets
.PHONY: all build clean install

# Default target
all: build

# Build the static library
build: $(LIBRARY)
	@echo "✓ Library built: $(LIBRARY)"

# Create the static library
$(LIBRARY): $(OBJECTS) | $(LIB_DIR)
	@echo "Creating static library..."
	$(AR) $(ARFLAGS) $@ $^

# Compile source files to object files
$(OBJ_DIR)/%.o: %.c | $(OBJ_DIR)
	@echo "Compiling $<..."
	$(CC) $(CFLAGS) -c $< -o $@

# Create build directories
$(BUILD_DIR) $(LIB_DIR) $(OBJ_DIR):
	@mkdir -p $@

# Clean build artifacts
clean:
	@echo "Cleaning math-lib build artifacts..."
	@rm -rf $(BUILD_DIR)
	@echo "✓ Clean complete"

# Install (copy headers and library to a common location)
install: build
	@echo "Installing math-lib..."
	@echo "✓ Library available at $(LIBRARY)"
