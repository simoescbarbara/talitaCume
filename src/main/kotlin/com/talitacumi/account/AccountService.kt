package com.talitacumi.account

import com.talitacumi.common.ConflictException
import com.talitacumi.common.NotFoundException
import com.talitacumi.common.UnauthorizedException
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import jakarta.validation.Valid
import jakarta.validation.constraints.Email
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.http.HttpStatus
import org.springframework.security.crypto.factory.PasswordEncoderFactories
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController
import java.util.UUID

interface AccountRepository : JpaRepository<Account, UUID> {
    @Query("select count(a) > 0 from Account a where lower(a.email) = lower(:email)")
    fun existsByEmailIgnoreCase(email: String): Boolean

    @Query("select a from Account a where lower(a.email) = lower(:email)")
    fun findByEmailIgnoreCase(email: String): Account?
}

@Configuration
class PasswordConfig {
    /** Writes "{bcrypt}..." hashes, so the algorithm can be upgraded later without breaking stored ones. */
    @Bean
    fun passwordEncoder(): PasswordEncoder = PasswordEncoderFactories.createDelegatingPasswordEncoder()
}

/** The person: shared by both sign-ups. A therapist's sign-up adds the professional profile on top. */
data class RegisterAccountRequest(
    @field:NotBlank @field:Size(max = 200) val name: String,
    @field:NotBlank @field:Email @field:Size(max = 200) val email: String,
    @field:NotBlank val phone: String,
    @field:NotBlank @field:Size(min = 8, max = 72) val password: String,
) {
    // Keep the password out of logs and error messages.
    override fun toString() = "RegisterAccountRequest(name=$name, email=$email, phone=$phone)"
}

data class LoginRequest(
    @field:NotBlank val email: String,
    @field:NotBlank val password: String,
) {
    override fun toString() = "LoginRequest(email=$email)"
}

data class AccountResponse(val id: UUID, val name: String, val email: String, val phone: String, val role: Role)

fun Account.toResponse() = AccountResponse(id, name, email, phone, role)

@Service
class AccountService(
    private val accounts: AccountRepository,
    private val passwordEncoder: PasswordEncoder,
) {
    /** Compared against when the e-mail is unknown, so a wrong e-mail takes as long as a wrong password. */
    private val dummyHash: String by lazy { passwordEncoder.encode("not-a-real-password")!! }

    /** Joins the caller's transaction, so a therapist sign-up saves the account and the profile together. */
    @Transactional
    fun register(request: RegisterAccountRequest, role: Role): Account {
        val email = AccountInput.email(request.email)
        val phone = AccountInput.phone(request.phone)
        val password = AccountInput.password(request.password)

        // Friendly error for the common case; the unique index settles two sign-ups racing with one e-mail.
        if (accounts.existsByEmailIgnoreCase(email)) throw ConflictException("This e-mail is already registered")

        return accounts.saveAndFlush(
            Account(
                name = request.name.trim(),
                email = email,
                phone = phone,
                passwordHash = passwordEncoder.encode(password)!!,
                role = role,
            ),
        )
    }

    /** The same error for unknown e-mail and wrong password, so the login can't be used to probe for accounts. */
    @Transactional(readOnly = true)
    fun authenticate(email: String, password: String): AccountResponse {
        val account = accounts.findByEmailIgnoreCase(AccountInput.email(email))
        val matches = passwordEncoder.matches(password, account?.passwordHash ?: dummyHash)
        if (account == null || !matches) throw UnauthorizedException("Invalid e-mail or password")
        return account.toResponse()
    }

    @Transactional(readOnly = true)
    fun get(id: UUID): AccountResponse =
        accounts.findById(id).orElseThrow { NotFoundException("Account $id not found") }.toResponse()
}

@RestController
@RequestMapping("/api")
class AccountController(
    private val service: AccountService,
    private val sessions: SessionService,
    private val cookies: SessionCookies,
    private val current: CurrentAccount,
) {
    /** A woman looking for help. Creates the account and signs her in, so she can book straight away. */
    @PostMapping("/accounts")
    @ResponseStatus(HttpStatus.CREATED)
    fun register(@Valid @RequestBody request: RegisterAccountRequest, response: HttpServletResponse): AccountResponse {
        val account = service.register(request, Role.CLIENT)
        cookies.issue(response, sessions.create(account.id))
        return account.toResponse()
    }

    @PostMapping("/auth/login")
    fun login(@Valid @RequestBody request: LoginRequest, response: HttpServletResponse): AccountResponse {
        val account = service.authenticate(request.email, request.password)
        cookies.issue(response, sessions.create(account.id))
        return account
    }

    @PostMapping("/auth/logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    fun logout(request: HttpServletRequest, response: HttpServletResponse) {
        sessions.revoke(cookies.read(request))
        cookies.clear(response)
    }

    @GetMapping("/auth/me")
    fun me(request: HttpServletRequest): AccountResponse = service.get(current.require(request).id)
}
