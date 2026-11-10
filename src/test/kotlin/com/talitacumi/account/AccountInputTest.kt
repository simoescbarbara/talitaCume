package com.talitacumi.account

import com.talitacumi.common.InvalidRequestException
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows

class AccountInputTest {

    @Test
    fun `email is trimmed and lowercased`() {
        assertEquals("ana@example.com", AccountInput.email("  Ana@Example.com "))
    }

    @Test
    fun `phone keeps only digits and needs the area code`() {
        assertEquals("11987654321", AccountInput.phone("(11) 98765-4321"))
        assertEquals("1133334444", AccountInput.phone("11 3333-4444"))
        assertThrows<InvalidRequestException> { AccountInput.phone("98765-4321") }
        assertThrows<InvalidRequestException> { AccountInput.phone("+55 11 98765-4321") }
    }

    @Test
    fun `password over 72 bytes is rejected, counting accented letters as two bytes`() {
        assertEquals("a".repeat(72), AccountInput.password("a".repeat(72)))
        assertThrows<InvalidRequestException> { AccountInput.password("ã".repeat(37)) }
    }
}
