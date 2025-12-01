<script setup lang="ts">
definePageMeta({
  layout: 'landing'
})
</script>

<template>
  <UContainer class="py-16">
    <div class="mx-auto max-w-3xl space-y-8">
      <div class="space-y-4">
        <h1 class="text-4xl font-bold text-highlighted">
          Terms and Conditions
        </h1>
        <p class="text-sm text-muted">
          Last updated: {{ new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) }}
        </p>
      </div>

      <USeparator />

      <div class="prose prose-neutral dark:prose-invert max-w-none space-y-6">
        <section class="space-y-3">
          <h2 class="text-2xl font-semibold text-highlighted">
            Agreement to Terms
          </h2>
          <p class="text-muted leading-relaxed">
            By accessing or using Daylight, you agree to be bound by these Terms and Conditions. If you disagree 
            with any part of these terms, you may not access the service.
          </p>
        </section>

        <section class="space-y-3">
          <h2 class="text-2xl font-semibold text-highlighted">
            Description of Service
          </h2>
          <p class="text-muted leading-relaxed">
            Daylight provides a platform for documenting, organizing, and managing evidence for legal proceedings. 
            The service includes features for audio recording, transcription, timeline creation, and evidence storage.
          </p>
        </section>

        <section class="space-y-3">
          <h2 class="text-2xl font-semibold text-highlighted">
            User Accounts
          </h2>
          <p class="text-muted leading-relaxed">
            When you create an account with us, you must provide accurate and complete information. You are 
            responsible for:
          </p>
          <ul class="list-disc list-inside text-muted space-y-2 ml-4">
            <li>Maintaining the security of your account credentials</li>
            <li>All activities that occur under your account</li>
            <li>Notifying us immediately of any unauthorized access</li>
          </ul>
        </section>

        <section class="space-y-3">
          <h2 class="text-2xl font-semibold text-highlighted">
            Acceptable Use
          </h2>
          <p class="text-muted leading-relaxed">
            You agree not to:
          </p>
          <ul class="list-disc list-inside text-muted space-y-2 ml-4">
            <li>Use the service for any illegal purpose</li>
            <li>Upload content that violates intellectual property rights</li>
            <li>Attempt to gain unauthorized access to our systems</li>
            <li>Interfere with or disrupt the service</li>
            <li>Use the service to harass, abuse, or harm others</li>
          </ul>
        </section>

        <section class="space-y-3">
          <h2 class="text-2xl font-semibold text-highlighted">
            Content and Ownership
          </h2>
          <p class="text-muted leading-relaxed">
            You retain all rights to the content you upload to Daylight. By uploading content, you grant us 
            a limited license to store, process, and display your content solely for the purpose of providing 
            the service to you.
          </p>
        </section>

        <section class="space-y-3">
          <h2 class="text-2xl font-semibold text-highlighted">
            Legal Disclaimer
          </h2>
          <p class="text-muted leading-relaxed">
            Daylight is a documentation tool and does not provide legal advice. The service is not a substitute 
            for professional legal counsel. Always consult with a qualified attorney for legal matters.
          </p>
        </section>

        <section class="space-y-3">
          <h2 class="text-2xl font-semibold text-highlighted">
            Limitation of Liability
          </h2>
          <p class="text-muted leading-relaxed">
            To the maximum extent permitted by law, Daylight shall not be liable for any indirect, incidental, 
            special, consequential, or punitive damages, or any loss of profits or revenues, whether incurred 
            directly or indirectly.
          </p>
        </section>

        <section class="space-y-3">
          <h2 class="text-2xl font-semibold text-highlighted">
            Service Availability
          </h2>
          <p class="text-muted leading-relaxed">
            We strive to maintain high availability but do not guarantee uninterrupted access to the service. 
            We reserve the right to modify, suspend, or discontinue any aspect of the service at any time.
          </p>
        </section>

        <section class="space-y-3">
          <h2 class="text-2xl font-semibold text-highlighted">
            Termination
          </h2>
          <p class="text-muted leading-relaxed">
            We may terminate or suspend your account at any time for violations of these terms. Upon termination, 
            your right to use the service will immediately cease.
          </p>
        </section>

        <section class="space-y-3">
          <h2 class="text-2xl font-semibold text-highlighted">
            Changes to Terms
          </h2>
          <p class="text-muted leading-relaxed">
            We reserve the right to modify these terms at any time. We will notify users of any material changes. 
            Your continued use of the service after changes constitutes acceptance of the new terms.
          </p>
        </section>

        <section class="space-y-3">
          <h2 class="text-2xl font-semibold text-highlighted">
            Governing Law
          </h2>
          <p class="text-muted leading-relaxed">
            These Terms shall be governed by and construed in accordance with applicable laws, without regard 
            to conflict of law provisions.
          </p>
        </section>

        <section class="space-y-3">
          <h2 class="text-2xl font-semibold text-highlighted">
            Contact Information
          </h2>
          <p class="text-muted leading-relaxed">
            For questions about these Terms and Conditions, please contact us at 
            <a href="mailto:hello@monumentlabs.io" class="text-primary hover:underline">hello@monumentlabs.io</a>.
          </p>
        </section>
      </div>
    </div>
  </UContainer>
</template>

