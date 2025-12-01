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
          Privacy Policy
        </h1>
        <p class="text-sm text-muted">
          Last updated: {{ new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) }}
        </p>
      </div>

      <USeparator />

      <div class="prose prose-neutral dark:prose-invert max-w-none space-y-6">
        <section class="space-y-3">
          <h2 class="text-2xl font-semibold text-highlighted">
            Introduction
          </h2>
          <p class="text-muted leading-relaxed">
            Welcome to Daylight. We respect your privacy and are committed to protecting your personal data. 
            This privacy policy explains how we collect, use, and safeguard your information when you use our service.
          </p>
        </section>

        <section class="space-y-3">
          <h2 class="text-2xl font-semibold text-highlighted">
            Information We Collect
          </h2>
          <p class="text-muted leading-relaxed">
            We collect information that you provide directly to us, including:
          </p>
          <ul class="list-disc list-inside text-muted space-y-2 ml-4">
            <li>Account information (email address, password)</li>
            <li>Evidence and documentation you upload to the platform</li>
            <li>Audio recordings and transcriptions</li>
            <li>Timeline entries and notes</li>
            <li>Usage data and analytics</li>
          </ul>
        </section>

        <section class="space-y-3">
          <h2 class="text-2xl font-semibold text-highlighted">
            How We Use Your Information
          </h2>
          <p class="text-muted leading-relaxed">
            We use the information we collect to:
          </p>
          <ul class="list-disc list-inside text-muted space-y-2 ml-4">
            <li>Provide, maintain, and improve our services</li>
            <li>Process and store your evidence securely</li>
            <li>Generate transcriptions and organize your documentation</li>
            <li>Communicate with you about service updates</li>
            <li>Ensure the security and integrity of our platform</li>
          </ul>
        </section>

        <section class="space-y-3">
          <h2 class="text-2xl font-semibold text-highlighted">
            Data Security
          </h2>
          <p class="text-muted leading-relaxed">
            We implement appropriate technical and organizational measures to protect your personal data against 
            unauthorized access, alteration, disclosure, or destruction. Your sensitive evidence is encrypted both 
            in transit and at rest.
          </p>
        </section>

        <section class="space-y-3">
          <h2 class="text-2xl font-semibold text-highlighted">
            Data Retention
          </h2>
          <p class="text-muted leading-relaxed">
            We retain your information for as long as your account is active or as needed to provide you services. 
            You may request deletion of your data at any time by contacting us.
          </p>
        </section>

        <section class="space-y-3">
          <h2 class="text-2xl font-semibold text-highlighted">
            Your Rights
          </h2>
          <p class="text-muted leading-relaxed">
            You have the right to:
          </p>
          <ul class="list-disc list-inside text-muted space-y-2 ml-4">
            <li>Access your personal data</li>
            <li>Correct inaccurate data</li>
            <li>Request deletion of your data</li>
            <li>Export your data</li>
            <li>Withdraw consent for data processing</li>
          </ul>
        </section>

        <section class="space-y-3">
          <h2 class="text-2xl font-semibold text-highlighted">
            Third-Party Services
          </h2>
          <p class="text-muted leading-relaxed">
            We use trusted third-party services to operate our platform, including cloud storage and authentication 
            providers. These services have their own privacy policies and security measures.
          </p>
        </section>

        <section class="space-y-3">
          <h2 class="text-2xl font-semibold text-highlighted">
            Changes to This Policy
          </h2>
          <p class="text-muted leading-relaxed">
            We may update this privacy policy from time to time. We will notify you of any changes by posting the 
            new policy on this page and updating the "Last updated" date.
          </p>
        </section>

        <section class="space-y-3">
          <h2 class="text-2xl font-semibold text-highlighted">
            Contact Us
          </h2>
          <p class="text-muted leading-relaxed">
            If you have any questions about this privacy policy or our data practices, please contact us at 
            <a href="mailto:hello@monumentlabs.io" class="text-primary hover:underline">hello@monumentlabs.io</a>.
          </p>
        </section>
      </div>
    </div>
  </UContainer>
</template>

