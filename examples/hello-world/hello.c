#include <stdio.h>
#include "hello.h"
#include "../math-lib/math_ops.h"

void print_hello(void) {
    printf("Hello, World from nx-make!\n");
    printf("Math demo: 5 * 3 = %d\n", multiply(5, 3));
    printf("Math demo: 2^8 = %d\n", power(2, 8));
    printf("Math demo: 10 / 4 = %.2f\n", divide(10.0, 4.0));
}

int add(int a, int b) {
    return a + b;
}
