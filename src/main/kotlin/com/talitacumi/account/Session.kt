package com.talitacumi.account

import com.talitacumi.common.ForbiddenException
import com.talitacumi.common.UnauthorizedException
import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.Table
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.springframework.boot.context.properties.ConfigurationProperties
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Modifying
import org.springframework.data.jpa.repository.Query
import org.springframework.http.HttpHeaders
import org.springframework.http.ResponseCookie
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Component
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.security.MessageDigest
import java.security.SecureRandom
import java.time.Duration
import java.time.Instant
import java.util.Base64
import java.util.HexFormat
import java.util.UUID

@Entity
@Table(name = "account_session")
class AccountSession(
    @Id val tokenHash: String,
    val accountId: UUID,
    val createdAt: Instant = Instant.now(),
    val expiresAt: Instant,
)

interface AccountSessionRepository : JpaRepository<AccountSession, String> {
    @Modifying
    @Query("delete from AccountSession s where s.expiresAt < :now")
    fun deleteExpired(now: Instant): Int
}

@ConfigurationProperties("app.session")
data class SessionProperties(
    val cookieName: String = "talitacumi_session",
    val ttl: Duration = Duration.ofDays(30),
    /** Send the cookie over HTTPS only. Off for local http://localhost; turn on everywhere else. */
    val secureCookie: Boolean = false,
)

@Service
class SessionService(
    private val sessions: AccountSessionRepository,
    private val properties: SessionProperties,
) {
    private val random = SecureRandom()

    /** Returns the raw token for the cookie. Only its hash is stored. */
    @Transactional
    fun create(accountId: UUID): String {
        val bytes = ByteArray(32).also(random::nextBytes)
        val token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes)
        sessions.save(AccountSession(tokenHash = hash(token), accountId = accountId, expiresAt = Instant.now() + properties.ttl))
        return token
    }

    /** The account behind a cookie, or null if it is missing, unknown or expired. */
    @Transactional(readOnly = true)
    fun accountId(token: String?): UUID? {
        if (token.isNullOrBlank()) return null
        val session = sessions.findById(hash(token)).orElse(null) ?: return null
        return session.accountId.takeIf { session.expiresAt.isAfter(Instant.now()) }
    }

    @Transactional
    fun revoke(token: String?) {
        if (!token.isNullOrBlank()) sessions.deleteById(hash(token))
    }

    @Scheduled(fixedDelayString = "PT1H")
    @Transactional
    fun purgeExpired() {
        sessions.deleteExpired(Instant.now())
    }

    private fun hash(token: String): String =
        HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(token.toByteArray()))
}

/** Writes and clears the session cookie. HttpOnly so page scripts can't read it; SameSite=Lax against CSRF. */
@Component
class SessionCookies(private val properties: SessionProperties) {
    fun read(request: HttpServletRequest): String? =
        request.cookies?.firstOrNull { it.name == properties.cookieName }?.value

    fun issue(response: HttpServletResponse, token: String) = write(response, token, properties.ttl)

    fun clear(response: HttpServletResponse) = write(response, "", Duration.ZERO)

    private fun write(response: HttpServletResponse, value: String, maxAge: Duration) {
        val cookie = ResponseCookie.from(properties.cookieName, value)
            .httpOnly(true)
            .secure(properties.secureCookie)
            .sameSite("Lax")
            .path("/")
            .maxAge(maxAge)
            .build()
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString())
    }
}

data class Caller(val id: UUID, val role: Role)

/** Who is calling, from the session cookie. Controllers use it to require a sign-in or a role. */
@Component
class CurrentAccount(
    private val sessions: SessionService,
    private val cookies: SessionCookies,
    private val accounts: AccountRepository,
) {
    fun require(request: HttpServletRequest): Caller {
        val id = sessions.accountId(cookies.read(request)) ?: throw UnauthorizedException("Sign in to continue")
        val account = accounts.findById(id).orElseThrow { UnauthorizedException("Sign in to continue") }
        return Caller(account.id, account.role)
    }

    fun require(request: HttpServletRequest, role: Role): Caller =
        require(request).also { if (it.role != role) throw ForbiddenException("This is only for ${role.name.lowercase()} accounts") }
}
