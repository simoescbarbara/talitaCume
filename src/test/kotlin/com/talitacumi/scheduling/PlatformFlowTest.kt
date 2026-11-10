package com.talitacumi.scheduling

import com.talitacumi.account.AccountService
import com.talitacumi.account.RegisterAccountRequest
import com.talitacumi.account.Role
import com.talitacumi.therapist.Modality
import com.talitacumi.therapist.RegisterTherapistRequest
import com.talitacumi.therapist.TherapistProfileRequest
import com.talitacumi.therapist.TherapistService
import com.talitacumi.therapist.Topic
import jakarta.servlet.http.Cookie
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.testcontainers.service.connection.ServiceConnection
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc
import org.springframework.http.MediaType
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.get
import org.springframework.test.web.servlet.patch
import org.springframework.test.web.servlet.post
import org.springframework.test.web.servlet.put
import org.testcontainers.junit.jupiter.Container
import org.testcontainers.junit.jupiter.Testcontainers
import org.testcontainers.postgresql.PostgreSQLContainer
import java.time.DayOfWeek
import java.time.LocalDate
import java.time.LocalTime
import java.util.UUID
import java.util.concurrent.Callable
import java.util.concurrent.CountDownLatch
import java.util.concurrent.Executors

/** Needs Docker. The platform's promises, end to end through the real database. */
@SpringBootTest(properties = ["app.admin-token=test-admin"])
@AutoConfigureMockMvc
@Testcontainers
class PlatformFlowTest {

    companion object {
        @Container
        @ServiceConnection
        @JvmStatic
        val postgres = PostgreSQLContainer("postgres:17")

        const val COOKIE = "talitacumi_session"
    }

    @Autowired lateinit var mvc: MockMvc
    @Autowired lateinit var accounts: AccountService
    @Autowired lateinit var therapists: TherapistService
    @Autowired lateinit var scheduling: SchedulingService
    @Autowired lateinit var slots: SlotService
    @Autowired lateinit var jdbc: JdbcTemplate

    private fun unique() = UUID.randomUUID().toString().take(8)

    private fun account(name: String) =
        RegisterAccountRequest(name, "${unique()}@example.com", "11987654321", "segredo123")

    private fun profile() = TherapistProfileRequest(
        approach = "Terapia Cognitivo-Comportamental",
        bio = "Acolho mulheres em momentos de ansiedade e luto.",
        faithNote = "Integro a fé cristã quando a cliente deseja.",
        topics = listOf(Topic.ANXIETY, Topic.GRIEF),
        city = "São Paulo",
        modality = Modality.ONLINE,
    )

    /** A verified therapist with Monday mornings open; returns her id and the next Monday. */
    private fun verifiedTherapist(): Pair<UUID, LocalDate> {
        val crp = "06/" + (100000..999999).random()
        val id = therapists.register(RegisterTherapistRequest(account("Dra. Marta"), crp, profile())).account.id
        therapists.verify(id)
        scheduling.replaceAvailability(
            id,
            listOf(AvailabilityRule(therapistId = id, dayOfWeek = DayOfWeek.MONDAY, startTime = LocalTime.of(9, 0), endTime = LocalTime.of(12, 0))),
        )
        var day = LocalDate.now().plusDays(7)
        while (day.dayOfWeek != DayOfWeek.MONDAY) day = day.plusDays(1)
        return id to day
    }

    private fun signUpClient(): Cookie {
        val result = mvc.post("/api/accounts") {
            contentType = MediaType.APPLICATION_JSON
            content = """{"name":"Ana","email":"${unique()}@example.com","phone":"(11) 98765-4321","password":"segredo123"}"""
        }.andExpect { status { isCreated() } }.andReturn()
        return result.response.getCookie(COOKIE)!!
    }

    @Test
    fun `unverified therapists stay out of search and profile`() {
        val crp = "06/" + (100000..999999).random()
        val id = therapists.register(RegisterTherapistRequest(account("Nova"), crp, profile())).account.id

        mvc.get("/api/therapists/$id").andExpect { status { isNotFound() } }
        assertTrue(therapists.search(null, null, null).none { it.id == id })

        mvc.post("/api/admin/therapists/$id/verify").andExpect { status { isForbidden() } }
        mvc.post("/api/admin/therapists/$id/verify") { header("X-Admin-Token", "test-admin") }
            .andExpect { status { isOk() } }
        mvc.get("/api/therapists/$id").andExpect { status { isOk() } }
        assertTrue(therapists.search(Topic.GRIEF, Modality.ONLINE, "são paulo").any { it.id == id })
        assertTrue(therapists.search(Topic.MOTHERHOOD, null, null).none { it.id == id })
        assertTrue(therapists.search(null, Modality.IN_PERSON, null).none { it.id == id })
    }

    @Test
    fun `a signed-in client books, both sides see it, and only they can cancel`() {
        val (therapistId, monday) = verifiedTherapist()
        val slot = slots.freeSlots(therapistId, monday).first()
        val ana = signUpClient()

        val body = """{"therapistId":"$therapistId","startsAt":"${slot.startsAt}","note":"Ansiedade","wantsFaith":true}"""
        mvc.post("/api/appointments") { contentType = MediaType.APPLICATION_JSON; content = body }
            .andExpect { status { isUnauthorized() } }
        val created = mvc.post("/api/appointments") { contentType = MediaType.APPLICATION_JSON; content = body; cookie(ana) }
            .andExpect {
                status { isCreated() }
                jsonPath("$.therapistName") { value("Dra. Marta") }
                jsonPath("$.wantsFaith") { value(true) }
                jsonPath("$.client") { doesNotExist() }
            }.andReturn().response.contentAsString
        val appointmentId = Regex("\"id\":\"([^\"]+)\"").find(created)!!.groupValues[1]

        // A therapist cannot book, and someone else cannot see or cancel Ana's session.
        val other = signUpClient()
        mvc.patch("/api/appointments/$appointmentId/cancel") { cookie(other) }.andExpect { status { isNotFound() } }

        mvc.patch("/api/appointments/$appointmentId/cancel") { cookie(ana) }
            .andExpect { status { isOk() }; jsonPath("$.status") { value("CANCELLED") } }
        assertTrue(slots.freeSlots(therapistId, monday).any { it.startsAt == slot.startsAt })
    }

    @Test
    fun `therapists edit their own availability and clients cannot`() {
        val ana = signUpClient()
        mvc.put("/api/therapists/me/availability") {
            contentType = MediaType.APPLICATION_JSON
            content = """{"rules":[]}"""
            cookie(ana)
        }.andExpect { status { isForbidden() } }
    }

    @Test
    fun `availability is stored in local time, so evening windows work in any JVM time zone`() {
        val (therapistId, _) = verifiedTherapist()
        val evening = AvailabilityRule(therapistId = therapistId, dayOfWeek = DayOfWeek.THURSDAY, startTime = LocalTime.of(19, 0), endTime = LocalTime.of(21, 0))
        val saved = scheduling.replaceAvailability(therapistId, listOf(evening))
        assertEquals(LocalTime.of(19, 0), saved.single().startTime)
        val stored = jdbc.queryForObject("select start_time::text from availability_rule where therapist_id = ?", String::class.java, therapistId)
        assertEquals("19:00:00", stored)
    }

    @Test
    fun `only one of many concurrent bookings for the same time succeeds`() {
        val (therapistId, monday) = verifiedTherapist()
        val target = slots.freeSlots(therapistId, monday).first()
        val clients = (1..8).map { accounts.register(account("Cliente $it"), Role.CLIENT).id }

        val pool = Executors.newFixedThreadPool(clients.size)
        val ready = CountDownLatch(clients.size)
        val go = CountDownLatch(1)
        val results = clients.map { clientId ->
            pool.submit(
                Callable {
                    ready.countDown()
                    go.await()
                    runCatching { scheduling.book(BookAppointment(therapistId, clientId, target.startsAt)) }.isSuccess
                },
            )
        }
        ready.await()
        go.countDown()
        val successes = results.count { it.get() }
        pool.shutdown()

        assertEquals(1, successes)
        assertEquals(false, slots.freeSlots(therapistId, monday).any { it.startsAt == target.startsAt })
    }
}
