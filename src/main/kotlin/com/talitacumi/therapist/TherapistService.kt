package com.talitacumi.therapist

import com.talitacumi.account.Account
import com.talitacumi.account.AccountRepository
import com.talitacumi.account.AccountResponse
import com.talitacumi.account.AccountService
import com.talitacumi.account.CurrentAccount
import com.talitacumi.account.RegisterAccountRequest
import com.talitacumi.account.Role
import com.talitacumi.account.SessionCookies
import com.talitacumi.account.SessionService
import com.talitacumi.account.toResponse
import com.talitacumi.common.ConflictException
import com.talitacumi.common.ForbiddenException
import com.talitacumi.common.NotFoundException
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import jakarta.validation.Valid
import jakarta.validation.constraints.Max
import jakarta.validation.constraints.Min
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.NotEmpty
import jakarta.validation.constraints.NotNull
import jakarta.validation.constraints.Size
import org.springframework.beans.factory.annotation.Value
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestHeader
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController
import java.security.MessageDigest
import java.time.Instant
import java.util.UUID

interface TherapistRepository : JpaRepository<Therapist, UUID> {
    fun findByVerifiedAtIsNotNull(): List<Therapist>
    fun findByVerifiedAtIsNullOrderByCreatedAt(): List<Therapist>
    fun existsByCrp(crp: String): Boolean
}

data class TherapistProfileRequest(
    @field:NotBlank @field:Size(max = 100) val approach: String,
    @field:NotBlank @field:Size(max = 2000) val bio: String,
    @field:Size(max = 500) val faithNote: String? = null,
    @field:NotEmpty val topics: List<Topic>,
    @field:NotBlank @field:Size(max = 100) val city: String,
    @field:NotNull val modality: Modality?,
    @field:Min(30) @field:Max(120) val sessionMinutes: Int = 50,
    @field:Min(0) val priceCents: Int? = null,
)

/** The person and the professional profile in one step, so a therapist never exists without a profile. */
data class RegisterTherapistRequest(
    @field:Valid @field:NotNull val account: RegisterAccountRequest?,
    @field:NotBlank val crp: String,
    @field:Valid @field:NotNull val profile: TherapistProfileRequest?,
)

data class TherapistResponse(
    val id: UUID,
    val name: String,
    val crp: String,
    val approach: String,
    val bio: String,
    val faithNote: String?,
    val topics: List<Topic>,
    val city: String,
    val modality: Modality,
    val sessionMinutes: Int,
    val priceCents: Int?,
    val verified: Boolean,
)

data class TherapistSignUpResponse(val account: AccountResponse, val therapist: TherapistResponse)

fun Therapist.toResponse(name: String) = TherapistResponse(
    accountId, name, crp, approach, bio, faithNote, topics, city, modality, sessionMinutes, priceCents, verified,
)

@Service
class TherapistService(
    private val therapists: TherapistRepository,
    private val accounts: AccountRepository,
    private val accountService: AccountService,
) {
    @Transactional
    fun register(request: RegisterTherapistRequest): TherapistSignUpResponse {
        val crp = TherapistInput.crp(request.crp)
        if (therapists.existsByCrp(crp)) throw ConflictException("This CRP is already registered")
        val account = accountService.register(request.account!!, Role.THERAPIST)
        val therapist = Therapist(
            accountId = account.id,
            crp = crp,
            approach = "",
            bio = "",
            topics = emptyList(),
            city = "",
            modality = Modality.ONLINE,
        ).apply { update(request.profile!!) }
        therapists.saveAndFlush(therapist)
        return TherapistSignUpResponse(account.toResponse(), therapist.toResponse(account.name))
    }

    /**
     * Verified therapists only, filtered in memory: fine for the first few hundred profiles.
     * Move to a SQL or search-engine query (as Meczap does with Typesense) when that stops being true.
     */
    @Transactional(readOnly = true)
    fun search(topic: Topic?, modality: Modality?, query: String?): List<TherapistResponse> {
        val names = names()
        val q = query?.trim()?.lowercase().orEmpty()
        return therapists.findByVerifiedAtIsNotNull()
            .filter { topic == null || topic in it.topics }
            .filter { modality == null || it.modality.serves(modality) }
            .map { it.toResponse(names[it.accountId].orEmpty()) }
            .filter { q.isEmpty() || listOf(it.name, it.approach, it.city).any { field -> q in field.lowercase() } }
            .sortedBy { it.name }
    }

    /** Public profile: unverified therapists are not found, so an unchecked CRP never reaches a client. */
    @Transactional(readOnly = true)
    fun getPublic(id: UUID): TherapistResponse {
        val therapist = therapists.findById(id).filter { it.verified }.orElseThrow { NotFoundException("Therapist $id not found") }
        return therapist.toResponse(nameOf(id))
    }

    @Transactional(readOnly = true)
    fun getOwn(id: UUID): TherapistResponse = require(id).toResponse(nameOf(id))

    @Transactional
    fun updateOwn(id: UUID, request: TherapistProfileRequest): TherapistResponse =
        require(id).apply { update(request) }.toResponse(nameOf(id))

    @Transactional(readOnly = true)
    fun pending(): List<TherapistResponse> {
        val names = names()
        return therapists.findByVerifiedAtIsNullOrderByCreatedAt().map { it.toResponse(names[it.accountId].orEmpty()) }
    }

    @Transactional
    fun verify(id: UUID): TherapistResponse {
        val therapist = require(id)
        if (therapist.verifiedAt == null) therapist.verifiedAt = Instant.now()
        return therapist.toResponse(nameOf(id))
    }

    private fun Therapist.update(request: TherapistProfileRequest) {
        approach = request.approach.trim()
        bio = request.bio.trim()
        faithNote = request.faithNote?.trim()?.ifBlank { null }
        topics = TherapistInput.topics(request.topics)
        city = request.city.trim()
        modality = request.modality!!
        sessionMinutes = request.sessionMinutes
        priceCents = request.priceCents
    }

    private fun require(id: UUID): Therapist =
        therapists.findById(id).orElseThrow { NotFoundException("Therapist $id not found") }

    private fun nameOf(id: UUID): String = accounts.findById(id).map(Account::name).orElse("")

    private fun names(): Map<UUID, String> = accounts.findAll().associate { it.id to it.name }
}

@RestController
@RequestMapping("/api/therapists")
class TherapistController(
    private val service: TherapistService,
    private val current: CurrentAccount,
    private val sessions: SessionService,
    private val cookies: SessionCookies,
) {
    /** Creates the account and the profile and signs the therapist in. The profile is listed once the CRP is verified. */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    fun register(@Valid @RequestBody request: RegisterTherapistRequest, response: HttpServletResponse): TherapistSignUpResponse {
        val result = service.register(request)
        cookies.issue(response, sessions.create(result.account.id))
        return result
    }

    @GetMapping
    fun search(
        @RequestParam(required = false) topic: Topic?,
        @RequestParam(required = false) modality: Modality?,
        @RequestParam(required = false) q: String?,
    ): List<TherapistResponse> = service.search(topic, modality, q)

    @GetMapping("/{id}")
    fun get(@PathVariable id: UUID): TherapistResponse = service.getPublic(id)

    @GetMapping("/me")
    fun me(request: HttpServletRequest): TherapistResponse =
        service.getOwn(current.require(request, Role.THERAPIST).id)

    @PutMapping("/me")
    fun updateMe(request: HttpServletRequest, @Valid @RequestBody body: TherapistProfileRequest): TherapistResponse =
        service.updateOwn(current.require(request, Role.THERAPIST).id, body)
}

/**
 * Whoever checks CRPs in the Conselho's public registry (cadastro.cfp.org.br) uses these.
 * A shared token is enough for a handful of reviewers; replace with staff accounts before it grows.
 */
@RestController
@RequestMapping("/api/admin/therapists")
class TherapistAdminController(
    private val service: TherapistService,
    @Value("\${app.admin-token:}") private val adminToken: String,
) {
    @GetMapping("/pending")
    fun pending(@RequestHeader("X-Admin-Token", required = false) token: String?): List<TherapistResponse> {
        requireAdmin(token)
        return service.pending()
    }

    @PostMapping("/{id}/verify")
    fun verify(@PathVariable id: UUID, @RequestHeader("X-Admin-Token", required = false) token: String?): TherapistResponse {
        requireAdmin(token)
        return service.verify(id)
    }

    private fun requireAdmin(token: String?) {
        val ok = adminToken.isNotBlank() && token != null &&
            MessageDigest.isEqual(token.toByteArray(), adminToken.toByteArray())
        if (!ok) throw ForbiddenException("Admin token required")
    }
}
