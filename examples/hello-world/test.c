#include <stdio.h>
#include <assert.h>
#include "hello.h"

void test_add() {
    printf("Testing add function...\n");
    assert(add(2, 3) == 5);
    assert(add(-1, 1) == 0);
    assert(add(0, 0) == 0);
    printf("  ✓ All add tests passed\n");
}

int main() {
    printf("Running tests...\n");
    test_add();
    printf("\n✓ All tests passed!\n");
    return 0;
}
